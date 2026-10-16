import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';

const _countries = <({String name, String code})>[
  (name: 'مصر', code: '+20'),
  (name: 'السعودية', code: '+966'),
  (name: 'الإمارات', code: '+971'),
  (name: 'الأردن', code: '+962'),
  (name: 'لبنان', code: '+961'),
  (name: 'الكويت', code: '+965'),
  (name: 'قطر', code: '+974'),
  (name: 'البحرين', code: '+973'),
  (name: 'عُمان', code: '+968'),
  (name: 'المملكة المتحدة', code: '+44'),
  (name: 'الولايات المتحدة', code: '+1'),
  (name: 'كندا', code: '+1'),
  (name: 'أستراليا', code: '+61'),
  (name: 'الهند', code: '+91'),
];

String _digits(String value) => value.replaceAll(RegExp(r'\D'), '');

class PhoneField extends StatefulWidget {
  const PhoneField({
    super.key,
    required this.value,
    required this.onChanged,
    required this.label,
    this.required = false,
  });

  final String value;
  final ValueChanged<String> onChanged;
  final String label;
  final bool required;

  @override
  State<PhoneField> createState() => _PhoneFieldState();
}

class _PhoneFieldState extends State<PhoneField> {
  late final TextEditingController _controller;
  late String _countryName;

  ({String name, String code}) _countryFor(String phone) {
    final matches =
        _countries.where((country) => phone.startsWith(country.code)).toList()
          ..sort((a, b) => b.code.length.compareTo(a.code.length));
    return matches.isEmpty ? _countries.first : matches.first;
  }

  String _localNumber(String phone, ({String name, String code}) country) {
    final digits = _digits(
      phone.startsWith(country.code)
          ? phone.substring(country.code.length)
          : phone,
    );
    return digits.replaceFirst(RegExp(r'^0+'), '');
  }

  @override
  void initState() {
    super.initState();
    final country = _countryFor(widget.value);
    _countryName = country.name;
    _controller = TextEditingController(
      text: _localNumber(widget.value, country),
    );
  }

  @override
  void didUpdateWidget(covariant PhoneField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.value != oldWidget.value) {
      final selected = _countries.firstWhere(
        (item) => item.name == _countryName,
      );
      final country = widget.value.startsWith(selected.code)
          ? selected
          : _countryFor(widget.value);
      _countryName = country.name;
      final local = _localNumber(widget.value, country);
      if (_controller.text != local) _controller.text = local;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final country = _countries.firstWhere((item) => item.name == _countryName);
    final dialDigits = _digits(country.code);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(widget.label),
        const SizedBox(height: 6),
        Row(
          children: [
            Flexible(
              flex: 5,
              child: DropdownButtonFormField<String>(
                initialValue: _countryName,
                isExpanded: true,
                decoration: const InputDecoration(
                  contentPadding: EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 12,
                  ),
                ),
                items: _countries
                    .map(
                      (item) => DropdownMenuItem(
                        value: item.name,
                        child: Text(
                          '${item.name} ${item.code}',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    )
                    .toList(),
                selectedItemBuilder: (context) => _countries
                    .map(
                      (item) => Align(
                        alignment: AlignmentDirectional.centerStart,
                        child: Text(
                          item.code,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textDirection: TextDirection.ltr,
                        ),
                      ),
                    )
                    .toList(),
                onChanged: (name) {
                  if (name == null) return;
                  final nextCountry = _countries.firstWhere(
                    (item) => item.name == name,
                  );
                  final local = _controller.text.replaceFirst(
                    RegExp(r'^0+'),
                    '',
                  );
                  setState(() => _countryName = name);
                  widget.onChanged(
                    local.isEmpty ? '' : '${nextCountry.code}$local',
                  );
                },
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              flex: 6,
              child: TextFormField(
                controller: _controller,
                keyboardType: TextInputType.phone,
                textDirection: TextDirection.ltr,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(15 - dialDigits.length),
                ],
                decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.phone),
                ),
                validator: (value) {
                  final local = _digits(
                    value ?? '',
                  ).replaceFirst(RegExp(r'^0+'), '');
                  if (widget.required && local.isEmpty) return 'مطلوب';
                  if (local.isEmpty) return null;
                  if (local.length < 7 ||
                      local.length + dialDigits.length > 15 ||
                      local.startsWith('0')) {
                    return 'أدخل رقم الهاتف من دون صفر البداية';
                  }
                  return null;
                },
                onChanged: (value) {
                  var local = _digits(value);
                  if (local.startsWith(dialDigits)) {
                    local = local.substring(dialDigits.length);
                  }
                  local = local.replaceFirst(RegExp(r'^0+'), '');
                  if (_controller.text != local) {
                    _controller.value = TextEditingValue(
                      text: local,
                      selection: TextSelection.collapsed(offset: local.length),
                    );
                  }
                  widget.onChanged(
                    local.isEmpty ? '' : '${country.code}$local',
                  );
                },
              ),
            ),
          ],
        ),
      ],
    );
  }
}
