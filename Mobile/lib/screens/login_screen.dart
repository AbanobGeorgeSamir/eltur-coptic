import 'package:material_ui/material_ui.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../models/user_model.dart';
import '../theme/app_theme.dart';
import 'home_screen.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _isCheckingServer = true;
  bool? _serverConnected;
  String? _serverMessage;

  @override
  void initState() {
    super.initState();
    _checkServerConnection();
  }

  Future<void> _checkServerConnection() async {
    if (mounted) {
      setState(() {
        _isCheckingServer = true;
        _serverMessage = null;
      });
    }
    try {
      final health = await ApiService.checkHealth();
      if (!mounted) return;
      setState(() {
        _serverConnected = health['status'] == 'ok';
        _serverMessage = _serverConnected == true
            ? 'Connected to the backend.'
            : 'The backend database is unavailable.';
      });
      if (_serverConnected == true &&
          AuthService.isLoggedIn &&
          AuthService.token != null) {
        try {
          final user = await ApiService.getCurrentUser();
          await AuthService.saveSession(
            UserModel.fromJson(user),
            AuthService.token!,
          );
          if (!mounted) return;
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const HomeScreen()),
          );
          return;
        } on ApiResponseException catch (error) {
          if (error.statusCode == 401 || error.statusCode == 403) {
            await AuthService.logout();
          }
        } catch (_) {
          // Leave the login form available if the session cannot be restored.
        }
      }
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _serverConnected = false;
        _serverMessage = error.toString().replaceAll('Exception: ', '');
      });
    } finally {
      if (mounted) setState(() => _isCheckingServer = false);
    }
  }

  Future<void> _handleLogin() async {
    final username = _usernameController.text.trim();
    final password = _passwordController.text;

    if (username.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('أدخل اسم المستخدم وكلمة المرور')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final res = await ApiService.login(username, password);
      final user = UserModel.fromJson(res['user']);
      final token = res['token']?.toString();
      if (token == null || token.isEmpty) {
        throw Exception('لم يُرجع الخادم رمز جلسة صالحاً.');
      }

      await AuthService.saveSession(user, token);

      if (!mounted) return;
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (_) => const HomeScreen()));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceAll('Exception: ', ''))),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: SafeArea(
          child: SingleChildScrollView(
            child: Column(
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.only(
                    top: 70,
                    bottom: 40,
                    left: 20,
                    right: 20,
                  ),
                  decoration: const BoxDecoration(
                    color: AppTheme.primaryBurgundy,
                    borderRadius: BorderRadius.only(
                      bottomLeft: Radius.circular(36),
                      bottomRight: Radius.circular(36),
                    ),
                  ),
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white.withValues(alpha: 0.15),
                          border: Border.all(
                            color: AppTheme.accentGold,
                            width: 2,
                          ),
                        ),
                        child: ClipOval(
                          child: Image.asset(
                            'resources/images/kenesa-icon.png',
                            width: 72,
                            height: 72,
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'كنيسة موسي النبي ومارمرقس الرسول',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.accentGold,
                        ),
                      ),
                      const Text(
                        'تسجيل الدخول - الخدمات الكنسية',
                        style: TextStyle(fontSize: 14, color: Colors.white70),
                      ),
                    ],
                  ),
                ),
                Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 520),
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 12,
                            ),
                            decoration: BoxDecoration(
                              color: _serverConnected == true
                                  ? Colors.green.withValues(alpha: 0.08)
                                  : Colors.red.withValues(alpha: 0.06),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: _serverConnected == true
                                    ? Colors.green.withValues(alpha: 0.35)
                                    : Colors.red.withValues(alpha: 0.25),
                              ),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  _isCheckingServer
                                      ? Icons.sync
                                      : _serverConnected == true
                                      ? Icons.cloud_done_outlined
                                      : Icons.cloud_off_outlined,
                                  color: _serverConnected == true
                                      ? Colors.green.shade700
                                      : Colors.red.shade700,
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    _isCheckingServer
                                        ? 'Checking backend connection…'
                                        : _serverMessage ??
                                              'Backend connection not checked.',
                                    style: const TextStyle(fontSize: 13),
                                    textDirection: TextDirection.ltr,
                                  ),
                                ),
                                IconButton(
                                  tooltip: 'Check again',
                                  onPressed: _isCheckingServer
                                      ? null
                                      : _checkServerConnection,
                                  icon: const Icon(Icons.refresh),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),
                          TextField(
                            controller: _usernameController,
                            decoration: const InputDecoration(
                              labelText: 'اسم المستخدم أو البريد الإلكتروني',
                              prefixIcon: Icon(
                                Icons.person_outline,
                                color: AppTheme.primaryBurgundy,
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          TextField(
                            controller: _passwordController,
                            obscureText: _obscurePassword,
                            decoration: InputDecoration(
                              labelText: 'كلمة المرور',
                              prefixIcon: const Icon(
                                Icons.lock_outline,
                                color: AppTheme.primaryBurgundy,
                              ),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscurePassword
                                      ? Icons.visibility_off
                                      : Icons.visibility,
                                  color: AppTheme.primaryBurgundy,
                                ),
                                onPressed: () => setState(
                                  () => _obscurePassword = !_obscurePassword,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),
                          _isLoading
                              ? const Center(child: CircularProgressIndicator())
                              : ElevatedButton(
                                  onPressed: () => _handleLogin(),
                                  child: const Text('تسجيل الدخول'),
                                ),
                          const SizedBox(height: 16),
                          Wrap(
                            alignment: WrapAlignment.center,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            spacing: 4,
                            children: [
                              const Text('ليس لديك حساب؟'),
                              TextButton(
                                onPressed: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => const RegisterScreen(),
                                    ),
                                  );
                                },
                                child: const Text(
                                  'إنشاء حساب جديد',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.primaryBurgundy,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
