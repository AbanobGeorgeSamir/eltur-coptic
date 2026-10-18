import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:project/services/api_service.dart';
import 'package:project/widgets/phone_field.dart';

void main() {
  testWidgets('phone field country selection fits a narrow RTL layout', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        home: Directionality(
          textDirection: TextDirection.rtl,
          child: Scaffold(
            body: Padding(
              padding: const EdgeInsets.all(24),
              child: PhoneField(
                label: 'رقم الهاتف',
                value: '',
                onChanged: (_) {},
              ),
            ),
          ),
        ),
      ),
    );

    expect(tester.takeException(), isNull);
    await tester.tap(find.byType(DropdownButtonFormField<String>));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.tap(find.text('المملكة المتحدة +44'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'phone field stores an international number and changes country code',
    (tester) async {
      var phone = '';
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Form(
              child: PhoneField(
                label: 'رقم الهاتف',
                required: true,
                value: phone,
                onChanged: (value) => phone = value,
              ),
            ),
          ),
        ),
      );

      await tester.enterText(find.byType(TextFormField), '1001234567');
      expect(phone, '+201001234567');

      await tester.tap(find.byType(DropdownButtonFormField<String>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('السعودية +966').last);
      await tester.pumpAndSettle();
      expect(phone, '+9661001234567');
    },
  );

  test(
    'production API is the default when no server override is saved',
    () async {
      SharedPreferences.setMockInitialValues({});
      await ApiService.init();
      expect(
        ApiService.baseUrl,
        'https://eltur-coptic-api-server.vercel.app/api',
      );
    },
  );

  test('server address can be saved for a physical device', () async {
    SharedPreferences.setMockInitialValues({});
    await ApiService.init();
    await ApiService.configureBaseUrl('http://192.168.1.10:8000');
    expect(ApiService.baseUrl, 'http://192.168.1.10:8000/api');
    await expectLater(
      ApiService.configureBaseUrl('ftp://invalid.example'),
      throwsFormatException,
    );
  });
}
