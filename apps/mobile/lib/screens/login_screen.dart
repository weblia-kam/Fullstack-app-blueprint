import 'package:flutter/material.dart';
import '../api/client.dart';

class LoginScreen extends StatefulWidget {
  final ApiClient api;
  const LoginScreen({super.key, required this.api});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  String tab = 'pw';
  final _id = TextEditingController();
  final _pw = TextEditingController();
  final _email = TextEditingController();
  final _token = TextEditingController();
  String? info;
  bool busy = false;

  Future<void> _doLogin() async {
    setState(() => busy = true);
    try {
      await widget.api.login(identifier: _id.text.trim(), password: _pw.text.trim());
      if (mounted) Navigator.of(context).pushReplacementNamed('/profile');
    } catch (e) {
      setState(() => info = 'Login feilet: $e');
    }
    setState(() => busy = false);
  }

  Future<void> _requestLink() async {
    setState(() => busy = true);
    try {
      final t = await widget.api.requestMagicLink(_email.text.trim());
      if (t.isNotEmpty) _token.text = t;
      setState(() => info = 'Sjekk MailHog (:8025) eller bruk dev token.');
    } catch (e) {
      setState(() => info = 'Kunne ikke sende lenke: $e');
    }
    setState(() => busy = false);
  }

  Future<void> _verify() async {
    setState(() => busy = true);
    try {
      await widget.api.verifyMagicLink(email: _email.text.trim(), token: _token.text.trim());
      if (mounted) Navigator.of(context).pushReplacementNamed('/profile');
    } catch (e) {
      setState(() => info = 'Verifisering feilet: $e');
    }
    setState(() => busy = false);
  }

  @override
  Widget build(BuildContext ctx) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sign in')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            ChoiceChip(
              label: const Text('Password'),
              selected: tab == 'pw',
              onSelected: (_) => setState(() => tab = 'pw'),
            ),
            const SizedBox(width: 8),
            ChoiceChip(
              label: const Text('Magic link'),
              selected: tab == 'ml',
              onSelected: (_) => setState(() => tab = 'ml'),
            ),
          ]),
          const SizedBox(height: 16),
          if (tab == 'pw') ...[
            TextField(controller: _id, decoration: const InputDecoration(labelText: 'Username or email')),
            TextField(controller: _pw, obscureText: true, decoration: const InputDecoration(labelText: 'Password')),
            const SizedBox(height: 12),
            ElevatedButton(onPressed: busy ? null : _doLogin, child: const Text('Sign in')),
          ] else ...[
            TextField(controller: _email, decoration: const InputDecoration(labelText: 'E-mail')),
            const SizedBox(height: 8),
            ElevatedButton(onPressed: busy ? null : _requestLink, child: const Text('Send magic link')),
            const Divider(height: 24),
            TextField(controller: _token, decoration: const InputDecoration(labelText: 'Dev token (optional)')),
            ElevatedButton(onPressed: busy ? null : _verify, child: const Text('Verify')),
          ],
          if (info != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(info!)),
        ]),
      ),
    );
  }
}
