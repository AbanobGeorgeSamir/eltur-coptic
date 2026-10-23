import 'package:flutter/cupertino.dart' show CupertinoPageTransitionsBuilder;
import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const Color primaryBurgundy = Color(0xFF101A2C);
  static const Color darkBurgundy = Color(0xFF091221);
  static const Color accentGold = Color(0xFFF2B84B);
  static const Color lightGold = Color(0xFFFFF5D8);
  static const Color deepNavy = Color(0xFF101A2C);
  static const Color warmBackground = Color(0xFFF5F7FB);
  static const Color cardSurface = Colors.white;
  static const Color textDark = Color(0xFF172033);
  static const Color textMuted = Color(0xFF687386);
  static const Color borderColor = Color(0xFFE6EAF0);
  static const SystemUiOverlayStyle systemUiOverlayStyle = SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    statusBarBrightness: Brightness.dark,
    systemNavigationBarIconBrightness: Brightness.dark,
  );

  static ThemeData get lightTheme {
    final scheme = ColorScheme.fromSeed(
      seedColor: primaryBurgundy,
      brightness: Brightness.light,
      primary: primaryBurgundy,
      secondary: accentGold,
      surface: cardSurface,
      onPrimary: Colors.white,
      onSecondary: textDark,
      onSurface: textDark,
    );
    final textTheme = GoogleFonts.cairoTextTheme().apply(
      bodyColor: textDark,
      displayColor: textDark,
    );
    final fieldBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(14),
      borderSide: const BorderSide(color: borderColor),
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: warmBackground,
      visualDensity: VisualDensity.adaptivePlatformDensity,
      textTheme: textTheme,
      // Smooth page transitions for navigation
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: CupertinoPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        },
      ),
      // Scrollbar styling for smoother scroll indicators
      scrollbarTheme: ScrollbarThemeData(
        thumbColor: WidgetStateProperty.all(
          primaryBurgundy.withValues(alpha: 0.3),
        ),
        radius: const Radius.circular(10),
        thickness: WidgetStateProperty.all(4.0),
        thumbVisibility: WidgetStateProperty.all(false),
        interactive: true,
      ),
      // Smooth text selection theme
      textSelectionTheme: TextSelectionThemeData(
        cursorColor: primaryBurgundy,
        selectionColor: accentGold.withValues(alpha: 0.35),
        selectionHandleColor: primaryBurgundy,
      ),
      // Splash / ripple effect customization for better touch feedback
      splashFactory: InkSparkle.splashFactory,
      splashColor: primaryBurgundy.withValues(alpha: 0.08),
      highlightColor: primaryBurgundy.withValues(alpha: 0.04),
      appBarTheme: const AppBarTheme(
        backgroundColor: primaryBurgundy,
        foregroundColor: Colors.white,
        systemOverlayStyle: systemUiOverlayStyle,
        surfaceTintColor: Colors.transparent,
        centerTitle: false,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: IconThemeData(color: Colors.white),
        titleTextStyle: TextStyle(
          color: Colors.white,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryBurgundy,
          foregroundColor: Colors.white,
          disabledBackgroundColor: const Color(0xFFD7DCE4),
          disabledForegroundColor: const Color(0xFF7B8493),
          elevation: 0,
          shadowColor: primaryBurgundy.withValues(alpha: 0.12),
          minimumSize: const Size(48, 48),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primaryBurgundy,
          minimumSize: const Size(44, 46),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          side: const BorderSide(color: borderColor),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primaryBurgundy,
          minimumSize: const Size(44, 44),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 15,
          vertical: 14,
        ),
        hintStyle: const TextStyle(color: textMuted, fontSize: 13),
        labelStyle: const TextStyle(color: textMuted, fontSize: 13),
        floatingLabelStyle: const TextStyle(
          color: primaryBurgundy,
          fontWeight: FontWeight.w700,
        ),
        border: fieldBorder,
        enabledBorder: fieldBorder,
        focusedBorder: fieldBorder.copyWith(
          borderSide: const BorderSide(color: primaryBurgundy, width: 1.5),
        ),
        errorBorder: fieldBorder.copyWith(
          borderSide: const BorderSide(color: Color(0xFFCC3F4B)),
        ),
        focusedErrorBorder: fieldBorder.copyWith(
          borderSide: const BorderSide(color: Color(0xFFCC3F4B), width: 1.5),
        ),
      ),
      cardTheme: CardThemeData(
        color: cardSurface,
        elevation: 0,
        shadowColor: primaryBurgundy.withValues(alpha: 0.06),
        surfaceTintColor: Colors.transparent,
        margin: const EdgeInsets.symmetric(vertical: 4),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: borderColor),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        indicatorColor: accentGold.withValues(alpha: 0.2),
        height: 70,
        elevation: 0,
        shadowColor: Colors.transparent,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            color: selected ? primaryBurgundy : textMuted,
            fontSize: 11,
            fontWeight: selected ? FontWeight.bold : FontWeight.w500,
          );
        }),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: const Color(0xFF202B3D),
        contentTextStyle: const TextStyle(color: Colors.white, fontSize: 13),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        showDragHandle: true,
        elevation: 0,
        shadowColor: Colors.transparent,
      ),
      dividerTheme: const DividerThemeData(
        color: borderColor,
        thickness: 1,
        space: 20,
      ),
      checkboxTheme: CheckboxThemeData(
        fillColor: WidgetStateProperty.resolveWith(
          (states) =>
              states.contains(WidgetState.selected) ? primaryBurgundy : null,
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: warmBackground,
        selectedColor: accentGold.withValues(alpha: 0.22),
        side: const BorderSide(color: borderColor),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        labelStyle: const TextStyle(
          color: textDark,
          fontWeight: FontWeight.w600,
        ),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: primaryBurgundy,
        linearTrackColor: borderColor,
      ),
    );
  }
}
