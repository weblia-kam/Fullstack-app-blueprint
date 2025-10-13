import 'dart:async';

import 'package:dio/dio.dart';

import '../services/secure_storage_service.dart';

const _skipAuthKey = '__skipAuth';
const _retriedKey = '__retried';
const _refreshCallKey = '__refreshCall';

class AuthExpiredException extends DioException {
  AuthExpiredException(RequestOptions requestOptions)
      : super(
          requestOptions: requestOptions,
          message: 'Session expired, please log in again',
          type: DioExceptionType.badResponse,
        );

  @override
  String toString() => message ?? 'Session expired, please log in again';
}

class ApiClient {
  factory ApiClient({Dio? dio, SecureStorageService? secureStorage}) {
    if (_singleton != null) return _singleton!;
    _singleton = ApiClient._internal(dio: dio, secureStorage: secureStorage);
    return _singleton!;
  }

  static void resetInstance() {
    _singleton = null;
  }

  ApiClient._internal({Dio? dio, SecureStorageService? secureStorage})
      : _dio = dio ?? Dio(BaseOptions(baseUrl: _resolveBaseUrl())),
        _secureStorage = secureStorage ?? SecureStorageService() {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (options.extra[_skipAuthKey] == true) {
          return handler.next(options);
        }
        if (_accessToken != null && _accessToken!.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $_accessToken';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (_shouldAttemptRefresh(error)) {
          try {
            await _refreshToken();
            final response = await _retry(error.requestOptions);
            return handler.resolve(response);
          } on AuthExpiredException catch (authError) {
            return handler.reject(authError);
          }
        }
        return handler.next(error);
      },
    ));
  }

  static const String _defaultApiOrigin = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.example.com',
  );
  static const String _defaultApiBasePath = String.fromEnvironment(
    'API_BASE_PATH',
    defaultValue: '/api/v1',
  );
  static const String _refreshEndpoint = String.fromEnvironment(
    'TOKEN_REFRESH_ENDPOINT',
    defaultValue: '/auth/refresh',
  );
  static ApiClient? _singleton;

  final Dio _dio;
  final SecureStorageService _secureStorage;

  String? _accessToken;
  Future<void>? _refreshFuture;
  void Function()? onAuthExpired;

  Future<String> requestMagicLink(String email) async {
    final r = await _dio.post('/auth/request-magic-link', data: {'email': email});
    final data = r.data as Map<String, dynamic>;
    return (data['devToken'] as String?) ?? '';
  }

  Future<void> verifyMagicLink({required String email, required String token}) async {
    final r = await _dio.post('/auth/verify-magic-link', data: {'email': email, 'token': token});
    final data = r.data as Map<String, dynamic>;
    await _persistTokens(
      accessToken: data['accessToken'] as String,
      refreshToken: data['refreshToken'] as String,
    );
  }

  Future<void> register({
    required String firstName,
    required String lastName,
    required String email,
    String? phone,
    String? birthDate,
    required String password,
    required bool acceptedTerms,
  }) async {
    final r = await _dio.post('/auth/register', data: {
      'firstName': firstName,
      'lastName': lastName,
      'email': email,
      if (phone != null) 'phone': phone,
      if (birthDate != null) 'birthDate': birthDate,
      'password': password,
      'acceptedTerms': acceptedTerms,
    });
    final data = r.data as Map<String, dynamic>;
    await _persistTokens(
      accessToken: data['accessToken'] as String,
      refreshToken: data['refreshToken'] as String,
    );
  }

  Future<void> registerFull({
    required String firstName,
    required String lastName,
    required String email,
    String? phone,
    String? birthDate,
    required String password,
    required bool acceptedTerms,
  }) async {
    await register(
      firstName: firstName,
      lastName: lastName,
      email: email,
      phone: phone,
      birthDate: birthDate,
      password: password,
      acceptedTerms: acceptedTerms,
    );
  }

  Future<void> login({required String identifier, required String password}) async {
    final r = await _dio.post('/auth/login', data: {
      'identifier': identifier,
      'password': password,
    });
    final data = r.data as Map<String, dynamic>;
    await _persistTokens(
      accessToken: data['accessToken'] as String,
      refreshToken: data['refreshToken'] as String,
    );
  }

  Future<void> logout() async {
    try {
      await _dio.post(
        '/auth/logout',
        options: Options(extra: const {_retriedKey: true}),
      );
    } finally {
      await _clearTokens();
    }
  }

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    ProgressCallback? onReceiveProgress,
  }) {
    return _dio.get<T>(
      path,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
      onReceiveProgress: onReceiveProgress,
    );
  }

  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) {
    return _dio.post<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
      onSendProgress: onSendProgress,
      onReceiveProgress: onReceiveProgress,
    );
  }

  Future<void> _persistTokens({required String accessToken, required String refreshToken}) async {
    _accessToken = accessToken;
    await _secureStorage.saveRefreshToken(refreshToken);
  }

  Future<void> _clearTokens() async {
    _accessToken = null;
    await _secureStorage.deleteRefreshToken();
  }

  bool _shouldAttemptRefresh(DioException error) {
    if (error.response?.statusCode != 401) return false;
    if (error.requestOptions.extra[_retriedKey] == true) return false;
    if (error.requestOptions.extra[_skipAuthKey] == true) return false;
    if (error.requestOptions.extra[_refreshCallKey] == true) return false;
    return true;
  }

  Future<void> _refreshToken() async {
    if (_refreshFuture != null) {
      return _refreshFuture!;
    }
    _refreshFuture = _doRefresh();
    try {
      await _refreshFuture!;
    } finally {
      _refreshFuture = null;
    }
  }

  Future<void> _doRefresh() async {
    final refreshToken = await _secureStorage.getRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) {
      await _clearTokens();
      _notifyAuthExpired();
      throw AuthExpiredException(RequestOptions(path: _refreshEndpoint));
    }
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        _refreshEndpoint,
        options: Options(
          headers: {'Authorization': 'Bearer $refreshToken'},
          extra: const {
            _skipAuthKey: true,
            _refreshCallKey: true,
          },
        ),
      );
      final data = response.data ?? <String, dynamic>{};
      final accessToken = data['accessToken'] as String?;
      final newRefreshToken = data['refreshToken'] as String?;
      if (accessToken == null || newRefreshToken == null) {
        await _clearTokens();
        _notifyAuthExpired();
        throw AuthExpiredException(response.requestOptions);
      }
      await _persistTokens(accessToken: accessToken, refreshToken: newRefreshToken);
    } on DioException {
      await _clearTokens();
      _notifyAuthExpired();
      throw AuthExpiredException(RequestOptions(path: _refreshEndpoint));
    }
  }

  Future<Response<dynamic>> _retry(RequestOptions requestOptions) {
    final headers = Map<String, dynamic>.from(requestOptions.headers)
      ..remove('Authorization');
    final extra = Map<String, dynamic>.from(requestOptions.extra)
      ..[_retriedKey] = true;
    final options = Options(
      method: requestOptions.method,
      headers: headers,
      responseType: requestOptions.responseType,
      contentType: requestOptions.contentType,
      followRedirects: requestOptions.followRedirects,
      validateStatus: requestOptions.validateStatus,
      receiveDataWhenStatusError: requestOptions.receiveDataWhenStatusError,
      sendTimeout: requestOptions.sendTimeout,
      receiveTimeout: requestOptions.receiveTimeout,
      extra: extra,
    );
    return _dio.request<dynamic>(
      requestOptions.path,
      data: requestOptions.data,
      queryParameters: requestOptions.queryParameters,
      options: options,
      cancelToken: requestOptions.cancelToken,
      onReceiveProgress: requestOptions.onReceiveProgress,
      onSendProgress: requestOptions.onSendProgress,
    );
  }

  void _notifyAuthExpired() {
    final callback = onAuthExpired;
    if (callback != null) {
      Future.microtask(callback);
    }
  }
}
  static String _resolveBaseUrl() {
    final origin = _defaultApiOrigin.endsWith('/')
        ? _defaultApiOrigin.substring(0, _defaultApiOrigin.length - 1)
        : _defaultApiOrigin;
    final path = _defaultApiBasePath.startsWith('/')
        ? _defaultApiBasePath
        : '/$_defaultApiBasePath';
    final normalizedPath = path.endsWith('/') ? path.substring(0, path.length - 1) : path;
    return '$origin$normalizedPath';
  }
