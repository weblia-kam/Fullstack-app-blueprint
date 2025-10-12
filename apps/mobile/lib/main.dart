import 'package:flutter/material.dart';
import 'api/client.dart';
import 'screens/login_screen.dart';
import 'screens/profile_screen.dart';

void main() => runApp(const App());

class App extends StatelessWidget {
  const App({super.key});
  static final ApiClient _api = ApiClient();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Blueprint',
      routes: {
        '/': (context) => LoginScreen(api: _api),
        '/profile': (context) => const ProfileScreen(),
      },
    );
  }
}
