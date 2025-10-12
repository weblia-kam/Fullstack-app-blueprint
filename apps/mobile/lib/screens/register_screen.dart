import 'package:flutter/material.dart';

import '../api/client.dart';

class RegisterScreen extends StatefulWidget {
  final ApiClient api;
  const RegisterScreen({super.key, required this.api});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _first = TextEditingController();
  final _last = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _birth = TextEditingController();
  final _pw = TextEditingController();
  bool accepted = false;
  bool busy = false;
  String? msg;

  @override
  void dispose() {
    _first.dispose();
    _last.dispose();
    _email.dispose();
    _phone.dispose();
    _birth.dispose();
    _pw.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (busy) return;
    setState(() {
      msg = null;
      busy = true;
    });
    try {
      final phone = _phone.text.trim();
      final birth = _birth.text.trim();
      await widget.api.registerFull(
        firstName: _first.text.trim(),
        lastName: _last.text.trim(),
        email: _email.text.trim(),
        phone: phone.isEmpty ? null : phone,
        birthDate: birth.isEmpty ? null : birth,
        password: _pw.text.trim(),
        acceptedTerms: accepted,
      );
      if (!mounted) return;
      Navigator.of(context).pushReplacementNamed('/profile');
    } catch (e) {
      setState(() => msg = 'Feil: $e');
    } finally {
      if (mounted) {
        setState(() => busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext ctx) {
    return Scaffold(
      appBar: AppBar(title: const Text('Opprett konto')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _first,
              decoration: const InputDecoration(labelText: 'Fornavn'),
              textInputAction: TextInputAction.next,
            ),
            TextField(
              controller: _last,
              decoration: const InputDecoration(labelText: 'Etternavn'),
              textInputAction: TextInputAction.next,
            ),
            TextField(
              controller: _email,
              decoration: const InputDecoration(labelText: 'E-post'),
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
            ),
            TextField(
              controller: _phone,
              decoration: const InputDecoration(labelText: 'Telefon (valgfritt)'),
              keyboardType: TextInputType.phone,
              textInputAction: TextInputAction.next,
            ),
            TextField(
              controller: _birth,
              decoration: const InputDecoration(labelText: 'Fødselsdato (YYYY-MM-DD)'),
              keyboardType: TextInputType.datetime,
              textInputAction: TextInputAction.next,
            ),
            TextField(
              controller: _pw,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Passord'),
            ),
            CheckboxListTile(
              value: accepted,
              onChanged: (v) => setState(() => accepted = v ?? false),
              title: const Text('Jeg godtar vilkårene for bruk'),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: busy ? null : _submit,
              child: busy
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Opprett konto'),
            ),
            if (msg != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(msg!),
              ),
            TextButton(
              onPressed: busy
                  ? null
                  : () => Navigator.of(context).pushReplacementNamed('/login'),
              child: const Text('Har du allerede en konto? Logg inn'),
            ),
          ],
        ),
      ),
    );
  }
}
