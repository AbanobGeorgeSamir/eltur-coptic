import 'dart:async';

import 'package:material_ui/material_ui.dart';

import '../theme/app_theme.dart';

class ChurchDateCard extends StatefulWidget {
  const ChurchDateCard({super.key});

  @override
  State<ChurchDateCard> createState() => _ChurchDateCardState();
}

class _ChurchDateCardState extends State<ChurchDateCard> {
  static const _weekdays = [
    'الاثنين',
    'الثلاثاء',
    'الأربعاء',
    'الخميس',
    'الجمعة',
    'السبت',
    'الأحد',
  ];
  static const _gregorianMonths = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ];
  static const _copticMonths = [
    'توت',
    'بابه',
    'هاتور',
    'كيهك',
    'طوبة',
    'أمشير',
    'برمهات',
    'برمودة',
    'بشنس',
    'بؤونة',
    'أبيب',
    'مسرى',
    'النسيء',
  ];
  static const _arabicDigits = '٠١٢٣٤٥٦٧٨٩';

  late DateTime _today;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _today = DateTime.now();
    _timer = Timer.periodic(const Duration(minutes: 1), (_) {
      if (mounted) setState(() => _today = DateTime.now());
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String _digits(int value) => value.toString().replaceAllMapped(
    RegExp(r'\d'),
    (match) => _arabicDigits[int.parse(match.group(0)!)],
  );

  int _julianDayNumber(DateTime date) {
    final a = (14 - date.month) ~/ 12;
    final year = date.year + 4800 - a;
    final month = date.month + 12 * a - 3;
    return date.day +
        (153 * month + 2) ~/ 5 +
        365 * year +
        year ~/ 4 -
        year ~/ 100 +
        year ~/ 400 -
        32045;
  }

  String get _gregorianDate =>
      '${_weekdays[_today.weekday - 1]}، ${_digits(_today.day)} ${_gregorianMonths[_today.month - 1]} ${_digits(_today.year)}';

  String get _copticDate {
    // 1 Thout, Coptic year 1 is JDN 1825030; Coptic leap years end in 3 mod 4.
    final daysSinceEpoch = _julianDayNumber(_today) - 1825030;
    final year = (4 * daysSinceEpoch + 1463) ~/ 1461;
    final firstDayOfYear = 365 * (year - 1) + year ~/ 4;
    final dayOfYear = daysSinceEpoch - firstDayOfYear;
    final monthIndex = dayOfYear ~/ 30;
    final day = dayOfYear % 30 + 1;
    return '${_digits(day)} ${_copticMonths[monthIndex]} ${_digits(year)}';
  }

  @override
  Widget build(BuildContext context) {
    final gregorian = _gregorianDate;
    final coptic = _copticDate;
    return Semantics(
      label: 'التاريخ الميلادي $gregorian، والتاريخ القبطي $coptic',
      child: Card(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.calendar_month_rounded,
                color: AppTheme.primaryBurgundy,
                size: 24,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'تاريخ اليوم',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: AppTheme.deepNavy,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text.rich(
                      TextSpan(
                        children: [
                          const TextSpan(
                            text: 'ميلادي: ',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          TextSpan(text: gregorian),
                        ],
                      ),
                      textDirection: TextDirection.rtl,
                      style: const TextStyle(
                        color: AppTheme.textDark,
                        height: 1.55,
                      ),
                    ),
                    Text.rich(
                      TextSpan(
                        children: [
                          const TextSpan(
                            text: 'قبطي: ',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          TextSpan(text: coptic),
                        ],
                      ),
                      textDirection: TextDirection.rtl,
                      style: const TextStyle(
                        color: AppTheme.textMuted,
                        height: 1.55,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
