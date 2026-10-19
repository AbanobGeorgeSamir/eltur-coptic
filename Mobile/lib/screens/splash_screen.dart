import 'package:material_ui/material_ui.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';
import '../models/user_model.dart';
import '../theme/app_theme.dart';
import 'home_screen.dart';
import 'public_home_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    _fadeAnimation = CurvedAnimation(parent: _controller, curve: Curves.easeIn);
    _controller.forward();

    _checkAuthAndNavigate();
  }

  Future<void> _checkAuthAndNavigate() async {
    await ApiService.init();
    await AuthService.init();
    final minimumSplashDuration = Future<void>.delayed(
      const Duration(seconds: 2),
    );
    if (AuthService.token != null && AuthService.token!.isNotEmpty) {
      try {
        final user = await ApiService.getCurrentUser(
          timeout: const Duration(seconds: 3),
        );
        await AuthService.saveSession(
          UserModel.fromJson(user),
          AuthService.token!,
        );
      } on ApiResponseException catch (error) {
        if (error.statusCode == 401 || error.statusCode == 403) {
          await AuthService.logout();
        }
      } catch (_) {
        // Keep the cached session when the server is temporarily unreachable.
      }
    }

    if (AuthService.currentUser == null) await AuthService.logout();

    await minimumSplashDuration;
    if (!mounted) return;

    if (AuthService.isLoggedIn && AuthService.token != null) {
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (_) => const HomeScreen()));
    } else {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const PublicHomeScreen()),
      );
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [
              AppTheme.darkBurgundy,
              AppTheme.primaryBurgundy,
              AppTheme.deepNavy,
            ],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withValues(alpha: 0.1),
                    border: Border.all(color: AppTheme.accentGold, width: 3),
                  ),
                  child: ClipOval(
                    child: Image.asset(
                      'resources/images/kenesa.jpeg',
                      width: 90,
                      height: 90,
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'كنيسة موسي النبي ومارمرقس الرسول',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.accentGold,
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'بوابة الكنيسة',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.white70,
                    fontStyle: FontStyle.italic,
                  ),
                ),
                const SizedBox(height: 48),
                const CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(
                    AppTheme.accentGold,
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
