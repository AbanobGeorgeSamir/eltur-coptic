import 'package:material_ui/material_ui.dart';
import '../widgets/ministry_feed.dart';

class SundaySchoolScreen extends StatelessWidget {
  const SundaySchoolScreen({super.key});

  @override
  Widget build(BuildContext context) =>
      const MinistryFeed(title: 'دروس مدارس الأحد', types: ['sunday_lesson']);
}
