import 'package:flutter/material.dart';

import '../api/client.dart';

class AuthService {
  AuthService({required GlobalKey<NavigatorState> navigatorKey, ApiClient? apiClient})
      : _navigatorKey = navigatorKey,
        _api = apiClient ?? ApiClient() {
    _api.onAuthExpired = _handleSessionExpired;
  }

  final ApiClient _api;
  final GlobalKey<NavigatorState> _navigatorKey;

  Future<void> logout() async {
    try {
      await _api.logout();
    } catch (_) {
      // Ignore network failures during logout but still clear local state and navigate.
    } finally {
      _navigatorKey.currentState?.pushNamedAndRemoveUntil('/login', (_) => false);
    }
  }

  void _handleSessionExpired() {
    final context = _navigatorKey.currentContext;
    if (context != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Session expired, please log in again')),
      );
    }
    _navigatorKey.currentState?.pushNamedAndRemoveUntil('/login', (_) => false);
  }
}
