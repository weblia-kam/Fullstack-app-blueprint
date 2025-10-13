import 'package:flutter_secure_storage/flutter_secure_storage.dart';

abstract class SecureKeyValueStore {
  const SecureKeyValueStore();

  Future<void> write({required String key, String? value});
  Future<String?> read({required String key});
  Future<void> delete({required String key});
}

class FlutterSecureKeyValueStore implements SecureKeyValueStore {
  FlutterSecureKeyValueStore({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  static const _androidOptions = AndroidOptions(encryptedSharedPreferences: true);
  static const _iosOptions = IOSOptions(accessibility: KeychainAccessibility.first_unlock_this_device);

  @override
  Future<void> write({required String key, String? value}) {
    return _storage.write(key: key, value: value, aOptions: _androidOptions, iOptions: _iosOptions);
  }

  @override
  Future<String?> read({required String key}) {
    return _storage.read(key: key, aOptions: _androidOptions, iOptions: _iosOptions);
  }

  @override
  Future<void> delete({required String key}) {
    return _storage.delete(key: key, aOptions: _androidOptions, iOptions: _iosOptions);
  }
}

class SecureStorageService {
  SecureStorageService({SecureKeyValueStore? store}) : _store = store ?? FlutterSecureKeyValueStore();

  final SecureKeyValueStore _store;

  static const _refreshTokenKey = 'refresh_token';

  Future<void> saveRefreshToken(String token) {
    return _store.write(key: _refreshTokenKey, value: token);
  }

  Future<String?> getRefreshToken() {
    return _store.read(key: _refreshTokenKey);
  }

  Future<void> deleteRefreshToken() {
    return _store.delete(key: _refreshTokenKey);
  }
}
