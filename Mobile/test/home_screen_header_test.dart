import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:project/widgets/church_name_title.dart';

void main() {
  testWidgets('the church name stays fully visible in a narrow mobile app bar', (
    tester,
  ) async {
    addTearDown(() async => tester.binding.setSurfaceSize(null));
    await tester.binding.setSurfaceSize(const Size(320, 800));
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          appBar: AppBar(
            toolbarHeight: 88,
            title: Row(
              children: const [
                SizedBox.square(dimension: 40),
                SizedBox(width: 8),
                Expanded(child: ChurchNameTitle()),
              ],
            ),
            actions: [
              IconButton(
                tooltip: 'المظهر',
                onPressed: null,
                icon: const Icon(Icons.color_lens_outlined),
              ),
              PopupMenuButton<void>(
                tooltip: 'خيارات الحساب',
                itemBuilder: (_) => const [],
              ),
            ],
          ),
        ),
      ),
    );

    const churchName = ChurchNameTitle.value;
    final title = tester.widget<Text>(find.text(churchName));
    expect(title.maxLines, isNull);
    expect(title.overflow, TextOverflow.visible);
    expect(find.byTooltip('خيارات الحساب'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
