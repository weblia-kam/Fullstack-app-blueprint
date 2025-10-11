import 'package:flutter/material.dart';
void main() => runApp(const App());
class App extends StatelessWidget {
  const App({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Blueprint',
      home: Scaffold(
        appBar: AppBar(title: const Text('Blueprint Mobile')),
        body: const Center(child: Text('Hello World — Mobile ✅')),
      ),
    );
  }
}
