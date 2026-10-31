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
    final palette = _SynaxariumPalette.forBrightness(
      Theme.of(context).brightness,
    );
    return FutureBuilder<SynaxariumSnapshot>(
      future: _snapshot,
      builder: (context, result) {
        return Card(
          color: palette.paper,
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
            side: BorderSide(color: palette.border),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: LayoutBuilder(
              builder: (context, constraints) {
                final wide = constraints.maxWidth >= 680;
                final content = _buildContent(
                  result,
                  wide: wide,
                  palette: palette,
                );
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
    required _SynaxariumPalette palette,
  }) {
    final snapshot = result.data;
    final header = _buildHeader(snapshot, palette);
    final details = _buildDetails(result, palette);

    if (wide) {
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 250, child: header),
          const SizedBox(width: 22),
          SizedBox(
            height: 245,
            child: VerticalDivider(color: palette.divider, width: 1),
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
        Padding(
          padding: EdgeInsets.symmetric(vertical: 14),
          child: Divider(color: palette.divider, height: 1),
        ),
        details,
      ],
    );
  }

  Widget _buildHeader(
    SynaxariumSnapshot? snapshot,
    _SynaxariumPalette palette,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
          decoration: BoxDecoration(
            color: palette.accent.withValues(alpha: palette.badgeFillAlpha),
            borderRadius: BorderRadius.circular(30),
            border: Border.all(
              color: palette.accent.withValues(alpha: palette.badgeBorderAlpha),
            ),
          ),
          child: Text(
            'السنكسار القبطي',
            style: TextStyle(
              color: palette.accent,
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'الأعياد القادمة',
          style: TextStyle(
            color: palette.heading,
            fontSize: 21,
            height: 1.3,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'تذكارات الكنيسة في الأيام المقبلة',
          style: TextStyle(color: palette.muted, fontSize: 12, height: 1.5),
        ),
        const SizedBox(height: 14),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: palette.insetSurface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: palette.insetBorder),
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
                      style: TextStyle(
                        color: palette.accent,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        height: 1.6,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      snapshot.todayGregorianDate,
                      style: TextStyle(color: palette.muted, fontSize: 11),
                    ),
                  ],
                ),
        ),
      ],
    );
  }

  Widget _buildDetails(
    AsyncSnapshot<SynaxariumSnapshot> result,
    _SynaxariumPalette palette,
  ) {
    if (result.hasError) {
      return _message(
        'تعذر تحميل تذكارات السنكسار الآن.',
        palette: palette,
        color: palette.error,
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
              color: palette.skeleton,
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      );
    }

    final observances = result.data!.observances;
    if (observances.isEmpty) {
      return _message(
        'لا توجد تذكارات مسجلة خلال الأيام المقبلة.',
        palette: palette,
      );
    }
    final visible = SynaxariumService.visibleObservances(
      observances,
      expanded: _expanded,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var index = 0; index < visible.length; index++) ...[
          _buildObservance(visible[index], palette),
          if (index < visible.length - 1)
            Divider(color: palette.divider, height: 1),
        ],
        if (observances.length > 3) ...[
          const SizedBox(height: 12),
          SizedBox(
            height: 46,
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: palette.action,
                foregroundColor: palette.actionText,
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

  Widget _buildObservance(
    SynaxariumObservance observance,
    _SynaxariumPalette palette,
  ) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 13),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: palette.indigo.withValues(alpha: palette.iconFillAlpha),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.calendar_month_rounded,
              color: palette.indigo,
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
                  style: TextStyle(
                    color: palette.heading,
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
                    _meta(observance.copticDate, palette),
                    _meta('·', palette),
                    _meta(observance.gregorianDate, palette),
                    _meta('·', palette),
                    _meta(observance.relativeDate, palette, accent: true),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _meta(
    String label,
    _SynaxariumPalette palette, {
    bool accent = false,
  }) => Text(
    label,
    style: TextStyle(
      color: accent ? palette.accent : palette.muted,
      fontSize: 11,
      fontWeight: accent ? FontWeight.w700 : FontWeight.w500,
      height: 1.6,
    ),
  );

  Widget _message(
    String text, {
    required _SynaxariumPalette palette,
    Color? color,
  }) => Container(
    padding: const EdgeInsets.all(15),
    decoration: BoxDecoration(
      color: palette.insetSurface,
      borderRadius: BorderRadius.circular(15),
      border: Border.all(color: palette.insetBorder),
    ),
    child: Text(
      text,
      style: TextStyle(
        color: color ?? palette.muted,
        height: 1.6,
        fontSize: 13,
      ),
    ),
  );
}

class _SynaxariumPalette {
  const _SynaxariumPalette({
    required this.paper,
    required this.border,
    required this.heading,
    required this.muted,
    required this.accent,
    required this.divider,
    required this.insetSurface,
    required this.insetBorder,
    required this.badgeFillAlpha,
    required this.badgeBorderAlpha,
    required this.iconFillAlpha,
    required this.skeleton,
    required this.error,
    required this.indigo,
    required this.action,
    required this.actionText,
  });

  final Color paper;
  final Color border;
  final Color heading;
  final Color muted;
  final Color accent;
  final Color divider;
  final Color insetSurface;
  final Color insetBorder;
  final double badgeFillAlpha;
  final double badgeBorderAlpha;
  final double iconFillAlpha;
  final Color skeleton;
  final Color error;
  final Color indigo;
  final Color action;
  final Color actionText;

  static _SynaxariumPalette forBrightness(Brightness brightness) {
    if (brightness == Brightness.dark) {
      return const _SynaxariumPalette(
        paper: AppTheme.darkCardSurface,
        border: AppTheme.darkBorderColor,
        heading: AppTheme.darkTextLight,
        muted: Color(0xFFB6C2D2),
        accent: AppTheme.accentGold,
        divider: Color(0xFF34435A),
        insetSurface: Color(0xFF101A2C),
        insetBorder: Color(0xFF34435A),
        badgeFillAlpha: 0.16,
        badgeBorderAlpha: 0.3,
        iconFillAlpha: 0.14,
        skeleton: Color(0xFF2A3850),
        error: Color(0xFFFDA4AF),
        indigo: Color(0xFFB8C5FF),
        action: AppTheme.accentGold,
        actionText: AppTheme.darkBurgundy,
      );
    }

    // Keep the established light reading palette unchanged.
    return const _SynaxariumPalette(
      paper: Color(0xFFFFFAF0),
      border: Color(0xFFEADFCB),
      heading: AppTheme.textDark,
      muted: AppTheme.textMuted,
      accent: Color(0xFF7D2038),
      divider: Color(0xFFE5DED2),
      insetSurface: Color(0xCCFFFFFF),
      insetBorder: Color(0xFFE7DECE),
      badgeFillAlpha: 0.07,
      badgeBorderAlpha: 0.13,
      iconFillAlpha: 0.09,
      skeleton: Color(0xFFE8E1D6),
      error: Color(0xFF9F2634),
      indigo: Color(0xFF303A78),
      action: Color(0xFF303A78),
      actionText: Colors.white,
    );
  }
}
