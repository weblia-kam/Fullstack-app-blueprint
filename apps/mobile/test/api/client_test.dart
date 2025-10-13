import 'dart:convert';

import 'package:blueprint_mobile/api/client.dart';
import 'package:blueprint_mobile/services/secure_storage_service.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeStore extends SecureKeyValueStore {
  final Map<String, String?> storage = {};

  @override
  Future<void> delete({required String key}) async {
    storage.remove(key);
  }

  @override
  Future<String?> read({required String key}) async {
    return storage[key];
  }

  @override
  Future<void> write({required String key, String? value}) async {
    storage[key] = value;
  }
}

class _FakeAdapter extends HttpClientAdapter {
  _FakeAdapter(this._handler);

  final Future<ResponseBody> Function(RequestOptions options) _handler;

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) {
    return _handler(options);
  }
}

ResponseBody _jsonResponse(Object data, int statusCode) {
  return ResponseBody.fromString(
    jsonEncode(data),
    statusCode,
    headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
  );
}

void main() {
  setUp(() {
    ApiClient.resetInstance();
  });

  test('automatically refreshes access token and retries original request', () async {
    final store = _FakeStore();
    final storageService = SecureStorageService(store: store);
    var protectedCallCount = 0;

    final dio = Dio(BaseOptions(baseUrl: 'https://api.example.com'))
      ..httpClientAdapter = _FakeAdapter((options) async {
        if (options.path == '/auth/login') {
          return _jsonResponse({'accessToken': 'access-1', 'refreshToken': 'refresh-1'}, 200);
        }
        if (options.path == '/auth/refresh') {
          expect(options.headers['Authorization'], equals('Bearer refresh-1'));
          return _jsonResponse({'accessToken': 'access-2', 'refreshToken': 'refresh-2'}, 200);
        }
        if (options.path == '/protected') {
          protectedCallCount += 1;
          if (protectedCallCount == 1) {
            expect(options.headers['Authorization'], equals('Bearer access-1'));
            return _jsonResponse({'message': 'expired'}, 401);
          }
          expect(options.headers['Authorization'], equals('Bearer access-2'));
          return _jsonResponse({'ok': true}, 200);
        }
        throw UnimplementedError('Unhandled path: ${options.path}');
      });

    final client = ApiClient(dio: dio, secureStorage: storageService);

    await client.login(identifier: 'user', password: 'pw');
    final response = await client.get<Map<String, dynamic>>('/protected');

    expect(response.data?['ok'], isTrue);
    expect(store.storage['refresh_token'], equals('refresh-2'));
    expect(protectedCallCount, equals(2));
  });

  test('clears tokens and throws AuthExpiredException when refresh fails', () async {
    final store = _FakeStore();
    final storageService = SecureStorageService(store: store);
    var protectedCallCount = 0;
    var authExpiredNotified = false;

    final dio = Dio(BaseOptions(baseUrl: 'https://api.example.com'))
      ..httpClientAdapter = _FakeAdapter((options) async {
        if (options.path == '/auth/login') {
          return _jsonResponse({'accessToken': 'access-1', 'refreshToken': 'refresh-1'}, 200);
        }
        if (options.path == '/auth/refresh') {
          expect(options.headers['Authorization'], equals('Bearer refresh-1'));
          return _jsonResponse({'error': 'invalid'}, 401);
        }
        if (options.path == '/protected') {
          protectedCallCount += 1;
          return _jsonResponse({'message': 'expired'}, 401);
        }
        throw UnimplementedError('Unhandled path: ${options.path}');
      });

    final client = ApiClient(dio: dio, secureStorage: storageService);
    client.onAuthExpired = () {
      authExpiredNotified = true;
    };

    await client.login(identifier: 'user', password: 'pw');

    await expectLater(
      client.get<Map<String, dynamic>>('/protected'),
      throwsA(isA<AuthExpiredException>()),
    );

    expect(protectedCallCount, equals(1));
    expect(store.storage.containsKey('refresh_token'), isFalse);
    expect(authExpiredNotified, isTrue);
  });
}
