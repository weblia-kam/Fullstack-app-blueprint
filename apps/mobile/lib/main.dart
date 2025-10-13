import 'package:flutter/material.dart';
import 'api/client.dart';
import 'screens/login_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/register_screen.dart';
import 'services/auth_service.dart';

void main() => runApp(const App());

class App extends StatelessWidget {
  const App({super.key});
  static final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();
  static final ApiClient _api = ApiClient();
  static final AuthService _auth = AuthService(navigatorKey: _navigatorKey, apiClient: _api);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Blueprint',
      navigatorKey: _navigatorKey,
      routes: {
        '/': (context) => LoginScreen(api: _api),
        '/login': (context) => LoginScreen(api: _api),
        '/register': (context) => RegisterScreen(api: _api),
        '/profile': (context) => ProfileScreen(auth: _auth),
      },
    );
  }
}
