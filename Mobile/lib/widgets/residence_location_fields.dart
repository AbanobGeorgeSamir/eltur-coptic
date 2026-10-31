import 'package:material_ui/material_ui.dart';

import '../data/residence_options.dart';

class ResidenceLocationFields extends StatelessWidget {
  const ResidenceLocationFields({
    super.key,
    required this.governorate,
    required this.city,
    required this.onGovernorateChanged,
    required this.onCityChanged,
  });

  final String governorate;
  final String city;
  final ValueChanged<String> onGovernorateChanged;
  final ValueChanged<String> onCityChanged;

  @override
  Widget build(BuildContext context) {
    final cities = egyptPlacesByGovernorate[governorate] ?? const <String>[];
    return Column(
      children: [
        DropdownButtonFormField<String>(
          initialValue: egyptGovernorates.contains(governorate)
              ? governorate
              : null,
          isExpanded: true,
          decoration: const InputDecoration(
            labelText: 'المحافظة *',
            prefixIcon: Icon(Icons.location_city_outlined),
          ),
          hint: const Text('اختر المحافظة'),
          items: egyptGovernorates
              .map(
                (item) => DropdownMenuItem(value: item, child: Text(item)),
              )
              .toList(),
          onChanged: (value) {
            final nextGovernorate = value ?? '';
            onGovernorateChanged(nextGovernorate);
            onCityChanged('');
          },
          validator: (value) => value == null || value.isEmpty
              ? 'اختر المحافظة'
              : null,
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          initialValue: cities.contains(city) ? city : null,
          isExpanded: true,
          decoration: const InputDecoration(
            labelText: 'المدينة أو الحي أو المركز *',
            prefixIcon: Icon(Icons.place_outlined),
          ),
          hint: Text(
            governorate.isEmpty
                ? 'اختر المحافظة أولاً'
                : 'اختر المدينة أو الحي أو المركز',
          ),
          items: cities
              .map(
                (item) => DropdownMenuItem(value: item, child: Text(item)),
              )
              .toList(),
          onChanged: governorate.isEmpty
              ? null
              : (value) => onCityChanged(value ?? ''),
          validator: (value) => value == null || value.isEmpty
              ? 'اختر المدينة أو الحي أو المركز'
              : null,
        ),
      ],
    );
  }
}
