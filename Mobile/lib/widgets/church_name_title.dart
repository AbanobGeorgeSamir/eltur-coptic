import 'package:material_ui/material_ui.dart';

class ChurchNameTitle extends StatelessWidget {
  const ChurchNameTitle({super.key});

  static const value = 'كنيسة موسى النبي ومارمرقس الرسول - طور سيناء';

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: value,
      child: const Text(
        value,
        softWrap: true,
        overflow: TextOverflow.visible,
        style: TextStyle(fontSize: 12, height: 1.2),
      ),
    );
  }
}
