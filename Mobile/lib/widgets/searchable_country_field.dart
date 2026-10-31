import 'package:material_ui/material_ui.dart';

import '../data/residence_options.dart';

class SearchableCountryField extends StatelessWidget {
  const SearchableCountryField({
    super.key,
    required this.value,
    required this.onChanged,
    required this.label,
    required this.hint,
    this.validator,
    this.allowClear = false,
  });

  final String value;
  final ValueChanged<String> onChanged;
  final String label;
  final String hint;
  final FormFieldValidator<String>? validator;
  final bool allowClear;

  Future<void> _openPicker(
    BuildContext context,
    FormFieldState<String> field,
  ) async {
    final selected = await showModalBottomSheet<ResidenceCountry>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => const _CountryPickerSheet(),
    );
    if (selected == null) return;
    field.didChange(selected.name);
    onChanged(selected.name);
  }

  @override
  Widget build(BuildContext context) => FormField<String>(
    key: ValueKey(value),
    initialValue: value.isEmpty ? null : value,
    validator: validator,
    builder: (field) => InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () => _openPicker(context, field),
      child: InputDecorator(
        isEmpty: field.value == null || field.value!.isEmpty,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          errorText: field.errorText,
          prefixIcon: const Icon(Icons.public_outlined),
          suffixIcon: allowClear && field.value?.isNotEmpty == true
              ? IconButton(
                  tooltip: '\u0645\u0633\u062d',
                  onPressed: () {
                    field.didChange(null);
                    onChanged('');
                  },
                  icon: const Icon(Icons.close),
                )
              : const Icon(Icons.keyboard_arrow_down),
        ),
        child: Text(
          field.value?.isNotEmpty == true ? field.value! : hint,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            color: field.value?.isNotEmpty == true
                ? Theme.of(context).colorScheme.onSurface
                : Theme.of(context).hintColor,
          ),
        ),
      ),
    ),
  );
}

class _CountryPickerSheet extends StatefulWidget {
  const _CountryPickerSheet();

  @override
  State<_CountryPickerSheet> createState() => _CountryPickerSheetState();
}

class _CountryPickerSheetState extends State<_CountryPickerSheet> {
  final _searchController = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final query = _query.trim().toLowerCase();
    final filteredCountries = residenceCountries
        .where((country) => country.name.toLowerCase().contains(query))
        .toList(growable: false);

    return SizedBox(
      height: MediaQuery.sizeOf(context).height * 0.82,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: TextField(
              controller: _searchController,
              autofocus: true,
              textDirection: TextDirection.rtl,
              onChanged: (value) => setState(() => _query = value),
              decoration: InputDecoration(
                labelText:
                    '\u0627\u0628\u062d\u062b \u0639\u0646 \u0628\u0644\u062f',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _query.isEmpty
                    ? null
                    : IconButton(
                        tooltip: '\u0645\u0633\u062d',
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _query = '');
                        },
                        icon: const Icon(Icons.close),
                      ),
              ),
            ),
          ),
          Expanded(
            child: filteredCountries.isEmpty
                ? Center(
                    child: Text(
                      '\u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u062a\u0627\u0626\u062c',
                      style: TextStyle(color: Theme.of(context).hintColor),
                    ),
                  )
                : ListView.separated(
                    keyboardDismissBehavior:
                        ScrollViewKeyboardDismissBehavior.onDrag,
                    itemCount: filteredCountries.length,
                    separatorBuilder: (_, _) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final country = filteredCountries[index];
                      return ListTile(
                        title: Text(country.name),
                        subtitle: Text(country.code),
                        onTap: () => Navigator.of(context).pop(country),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
