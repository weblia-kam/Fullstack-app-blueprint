import 'package:test/test.dart';
import 'package:blueprint_sdk/blueprint_sdk.dart';


/// tests for AuthApi
void main() {
  final instance = BlueprintSdk().getAuthApi();

  group(AuthApi, () {
    //Future authControllerLogout() async
    test('test authControllerLogout', () async {
      // TODO
    });

    //Future authControllerRefresh() async
    test('test authControllerRefresh', () async {
      // TODO
    });

    //Future authControllerRequestMagicLink() async
    test('test authControllerRequestMagicLink', () async {
      // TODO
    });

    //Future authControllerVerifyMagicLink() async
    test('test authControllerVerifyMagicLink', () async {
      // TODO
    });

  });
}
