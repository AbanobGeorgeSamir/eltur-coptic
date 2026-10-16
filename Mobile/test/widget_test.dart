import 'package:flutter_test/flutter_test.dart';
import 'package:project/main.dart';

void main() {
  testWidgets('Eltor Coptic app smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const EltorCopticApp());
    expect(find.byType(EltorCopticApp), findsOneWidget);
  });
}
