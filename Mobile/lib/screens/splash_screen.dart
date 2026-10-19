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
  late final AnimationController _controller;
  late final Animation<double> _fadeAnimation;

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
      backgroundColor: AppTheme.deepNavy,
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
        child: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final screenWidth = constraints.maxWidth;
              final screenHeight = constraints.maxHeight;
              final scale = (screenWidth / 412).clamp(0.82, 1.0).toDouble();
              final logoSize = (screenWidth * 0.36)
                  .clamp(112.0, 148.0)
                  .toDouble();

              return FadeTransition(
                opacity: _fadeAnimation,
                child: SingleChildScrollView(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(minHeight: screenHeight),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: logoSize,
                              height: logoSize,
                              padding: const EdgeInsets.all(24),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: Colors.white.withValues(alpha: 0.08),
                                border: Border.all(
                                  color: AppTheme.accentGold,
                                  width: 3,
                                ),
                              ),
                              child: ClipOval(
                                child: Image.asset(
                                  'resources/images/kenesa.jpeg',
                                  fit: BoxFit.cover,
                                ),
                              ),
                            ),
                            SizedBox(height: screenHeight * 0.045),
                            Text(
                              'كنيسة موسى النبي\nومارمرقس الرسول',
                              textAlign: TextAlign.center,
                              textDirection: TextDirection.rtl,
                              style: TextStyle(
                                fontSize: 34 * scale,
                                height: 1.24,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.accentGold,
                              ),
                            ),
                            SizedBox(height: screenHeight * 0.015),
                            Text(
                              'بوابة الخدمات الكنسية',
                              textAlign: TextAlign.center,
                              textDirection: TextDirection.rtl,
                              style: TextStyle(
                                fontSize: 19 * scale,
                                height: 1.35,
                                fontStyle: FontStyle.italic,
                                color: const Color(0xFFB6B8C2),
                              ),
                            ),
                            SizedBox(height: screenHeight * 0.012),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 18,
                                vertical: 7,
                              ),
                              decoration: BoxDecoration(
                                color: AppTheme.accentGold.withValues(
                                  alpha: 0.1,
                                ),
                                borderRadius: BorderRadius.circular(32),
                                border: Border.all(
                                  color: AppTheme.accentGold,
                                  width: 1.5,
                                ),
                              ),
                              child: Text(
                                'الخدمات الكنسية',
                                textDirection: TextDirection.rtl,
                                style: TextStyle(
                                  fontSize: 19 * scale,
                                  height: 1.25,
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.accentGold,
                                ),
                              ),
                            ),
                            SizedBox(height: screenHeight * 0.058),
                            SizedBox(
                              width: 40,
                              height: 40,
                              child: CircularProgressIndicator(
                                strokeWidth: 3.2,
                                valueColor: const AlwaysStoppedAnimation<Color>(
                                  AppTheme.accentGold,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
