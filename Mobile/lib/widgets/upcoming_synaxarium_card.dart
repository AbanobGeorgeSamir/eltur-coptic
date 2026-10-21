import 'dart:async';

import 'package:material_ui/material_ui.dart';

import '../services/synaxarium_service.dart';
import '../theme/app_theme.dart';

class UpcomingSynaxariumCard extends StatefulWidget {
  const UpcomingSynaxariumCard({super.key});

  @override
  State<UpcomingSynaxariumCard> createState() => _UpcomingSynaxariumCardState();
}

class _UpcomingSynaxariumCardState extends State<UpcomingSynaxariumCard> {
  static const _indigo = Color(0xFF303A78);

  late DateTime _now;
  late Future<SynaxariumSnapshot> _snapshot;
  Timer? _clock;
  bool _expanded = false;

  @override
  void initState() {
    super.initState();
    _now = DateTime.now();
    _snapshot = SynaxariumService.loadUpcoming(now: _now);
    _clock = Timer.periodic(const Duration(minutes: 1), (_) {
      if (!mounted) return;
      setState(() {
        _now = DateTime.now();
        _snapshot = SynaxariumService.loadUpcoming(now: _now);
      });
    });
  }

  @override
  void dispose() {
    _clock?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<SynaxariumSnapshot>(
      future: _snapshot,
      builder: (context, result) {
        return Card(
          color: const Color(0xFFFFFAF0),
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
            side: const BorderSide(color: Color(0xFFEADFCB)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: LayoutBuilder(
              builder: (context, constraints) {
                final wide = constraints.maxWidth >= 680;
                final content = _buildContent(result, wide: wide);
                return Semantics(
                  container: true,
                  label: 'السنكسار القبطي، الأعياد والتذكارات القادمة',
                  child: content,
                );
              },
            ),
          ),
        );
      },
    );
  }

  Widget _buildContent(
    AsyncSnapshot<SynaxariumSnapshot> result, {
    required bool wide,
  }) {
    final snapshot = result.data;
    final header = _buildHeader(snapshot);
    final details = _buildDetails(result);

    if (wide) {
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 250, child: header),
          const SizedBox(width: 22),
          const SizedBox(
            height: 245,
            child: VerticalDivider(color: Color(0xFFE5DED2), width: 1),
          ),
          const SizedBox(width: 22),
          Expanded(child: details),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        header,
        const Padding(
          padding: EdgeInsets.symmetric(vertical: 14),
          child: Divider(color: Color(0xFFE5DED2), height: 1),
        ),
        details,
      ],
    );
  }

  Widget _buildHeader(SynaxariumSnapshot? snapshot) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
          decoration: BoxDecoration(
            color: const Color(0xFF7D2038).withValues(alpha: 0.07),
            borderRadius: BorderRadius.circular(30),
            border: Border.all(
              color: const Color(0xFF7D2038).withValues(alpha: 0.13),
            ),
          ),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.auto_awesome_rounded,
                size: 15,
                color: Color(0xFF7D2038),
              ),
              SizedBox(width: 6),
              Text(
                'السنكسار القبطي',
                style: TextStyle(
                  color: Color(0xFF7D2038),
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        const Text(
          'الأعياد القادمة',
          style: TextStyle(
            color: AppTheme.deepNavy,
            fontSize: 21,
            height: 1.3,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'تذكارات الكنيسة في الأيام المقبلة',
          style: TextStyle(
            color: AppTheme.textMuted,
            fontSize: 12,
            height: 1.5,
          ),
        ),
        const SizedBox(height: 14),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.8),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE7DECE)),
          ),
          child: snapshot == null
              ? const Row(
                  children: [
                    SizedBox(
                      width: 15,
                      height: 15,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                    SizedBox(width: 9),
                    Text(
                      'جارٍ تحميل تاريخ اليوم',
                      style: TextStyle(fontSize: 12),
                    ),
                  ],
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      snapshot.todayCopticDate,
                      style: const TextStyle(
                        color: Color(0xFF7D2038),
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        height: 1.6,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      snapshot.todayGregorianDate,
                      style: const TextStyle(
                        color: AppTheme.textMuted,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
        ),
      ],
    );
  }

  Widget _buildDetails(AsyncSnapshot<SynaxariumSnapshot> result) {
    if (result.hasError) {
      return _message(
        'تعذر تحميل تذكارات السنكسار الآن.',
        color: const Color(0xFF9F2634),
      );
    }
    if (!result.hasData) {
      return Column(
        children: List.generate(
          3,
          (index) => Container(
            margin: const EdgeInsets.only(bottom: 12),
            height: 48,
            decoration: BoxDecoration(
              color: const Color(0xFFE8E1D6),
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      );
    }

    final observances = result.data!.observances;
    if (observances.isEmpty) {
      return _message('لا توجد تذكارات مسجلة خلال الأيام المقبلة.');
    }
    final visible = observances.take(_expanded ? 10 : 3).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var index = 0; index < visible.length; index++) ...[
          _buildObservance(visible[index]),
          if (index < visible.length - 1)
            const Divider(color: Color(0xFFE5DED2), height: 1),
        ],
        if (observances.length > 3) ...[
          const SizedBox(height: 12),
          SizedBox(
            height: 46,
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: _indigo,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(13),
                ),
              ),
              onPressed: () => setState(() => _expanded = !_expanded),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(_expanded ? 'عرض أقل' : 'المزيد'),
                  const SizedBox(width: 8),
                  Icon(
                    _expanded
                        ? Icons.keyboard_arrow_up_rounded
                        : Icons.arrow_back_rounded,
                    size: 19,
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildObservance(SynaxariumObservance observance) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 13),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: _indigo.withValues(alpha: 0.09),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.calendar_month_rounded,
              color: _indigo,
              size: 16,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  observance.name,
                  style: const TextStyle(
                    color: AppTheme.deepNavy,
                    fontSize: 14,
                    height: 1.55,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 3),
                Wrap(
                  spacing: 7,
                  runSpacing: 2,
                  children: [
                    _meta(observance.copticDate),
                    _meta('·'),
                    _meta(observance.gregorianDate),
                    _meta('·'),
                    _meta(observance.relativeDate, accent: true),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _meta(String label, {bool accent = false}) => Text(
    label,
    style: TextStyle(
      color: accent ? const Color(0xFF7D2038) : AppTheme.textMuted,
      fontSize: 11,
      fontWeight: accent ? FontWeight.w700 : FontWeight.w500,
      height: 1.6,
    ),
  );

  Widget _message(String text, {Color color = AppTheme.textMuted}) => Container(
    padding: const EdgeInsets.all(15),
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: 0.8),
      borderRadius: BorderRadius.circular(15),
      border: Border.all(color: const Color(0xFFE7DECE)),
    ),
    child: Text(
      text,
      style: TextStyle(color: color, height: 1.6, fontSize: 13),
    ),
  );
}
