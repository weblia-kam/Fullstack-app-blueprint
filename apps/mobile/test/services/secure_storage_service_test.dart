import 'package:flutter_test/flutter_test.dart';

import 'package:blueprint_mobile/services/secure_storage_service.dart';

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

void main() {
  test('stores and retrieves refresh token securely', () async {
    final store = _FakeStore();
    final service = SecureStorageService(store: store);

    await service.saveRefreshToken('refresh-token');
    expect(store.storage['refresh_token'], equals('refresh-token'));

    final token = await service.getRefreshToken();
    expect(token, equals('refresh-token'));
  });

  test('delete refresh token clears persisted value', () async {
    final store = _FakeStore();
    final service = SecureStorageService(store: store);

    await service.saveRefreshToken('refresh-token');
    await service.deleteRefreshToken();

    expect(store.storage.containsKey('refresh_token'), isFalse);
    final token = await service.getRefreshToken();
    expect(token, isNull);
  });
}
