import 'package:dio/dio.dart';

class TokenStore {
  String? accessToken;
  String? refreshToken;

  Future<void> saveTokens({required String access, required String refresh}) async {
    accessToken = access;
    refreshToken = refresh;
  }
}

class ApiClient {
  final Dio _dio;
  final TokenStore _store;

  ApiClient({Dio? dio, TokenStore? store, String? baseUrl})
      : _store = store ?? TokenStore(),
        _dio = dio ?? Dio(BaseOptions(baseUrl: baseUrl ?? _defaultBaseUrl));

  static const String _defaultBaseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://localhost:4000',
  );

  Future<String> requestMagicLink(String email) async {
    final r = await _dio.post('/auth/request-magic-link', data: {'email': email});
    final data = r.data as Map<String, dynamic>;
    return (data['devToken'] as String?) ?? '';
  }

  Future<void> verifyMagicLink({required String email, required String token}) async {
    final r = await _dio.post('/auth/verify-magic-link', data: {'email': email, 'token': token});
    final data = r.data as Map<String, dynamic>;
    await _store.saveTokens(
      access: data['accessToken'] as String,
      refresh: data['refreshToken'] as String,
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
    await _store.saveTokens(access: data['accessToken'] as String, refresh: data['refreshToken'] as String);
  }

  Future<void> registerFull({
    required String firstName,
    required String lastName,
    required String email,
    String? phone,
    String? birthDate,
    required String password,
    required bool acceptedTerms,
  }) {
    return register(
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
    await _store.saveTokens(access: data['accessToken'] as String, refresh: data['refreshToken'] as String);
  }
}
