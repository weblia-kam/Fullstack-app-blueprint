# blueprint_sdk.api.AuthApi

## Load the API package
```dart
import 'package:blueprint_sdk/api.dart';
```

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**authControllerLogout**](AuthApi.md#authcontrollerlogout) | **POST** /auth/logout | 
[**authControllerRefresh**](AuthApi.md#authcontrollerrefresh) | **POST** /auth/refresh | 
[**authControllerRequestMagicLink**](AuthApi.md#authcontrollerrequestmagiclink) | **POST** /auth/request-magic-link | 
[**authControllerVerifyMagicLink**](AuthApi.md#authcontrollerverifymagiclink) | **POST** /auth/verify-magic-link | 


# **authControllerLogout**
> authControllerLogout()



### Example
```dart
import 'package:blueprint_sdk/api.dart';

final api = BlueprintSdk().getAuthApi();

try {
    api.authControllerLogout();
} catch on DioException (e) {
    print('Exception when calling AuthApi->authControllerLogout: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **authControllerRefresh**
> authControllerRefresh()



### Example
```dart
import 'package:blueprint_sdk/api.dart';
// TODO Configure API key authorization: cookie
//defaultApiClient.getAuthentication<ApiKeyAuth>('cookie').apiKey = 'YOUR_API_KEY';
// uncomment below to setup prefix (e.g. Bearer) for API key, if needed
//defaultApiClient.getAuthentication<ApiKeyAuth>('cookie').apiKeyPrefix = 'Bearer';

final api = BlueprintSdk().getAuthApi();

try {
    api.authControllerRefresh();
} catch on DioException (e) {
    print('Exception when calling AuthApi->authControllerRefresh: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

[cookie](../README.md#cookie), [bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **authControllerRequestMagicLink**
> authControllerRequestMagicLink()



### Example
```dart
import 'package:blueprint_sdk/api.dart';

final api = BlueprintSdk().getAuthApi();

try {
    api.authControllerRequestMagicLink();
} catch on DioException (e) {
    print('Exception when calling AuthApi->authControllerRequestMagicLink: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **authControllerVerifyMagicLink**
> authControllerVerifyMagicLink()



### Example
```dart
import 'package:blueprint_sdk/api.dart';

final api = BlueprintSdk().getAuthApi();

try {
    api.authControllerVerifyMagicLink();
} catch on DioException (e) {
    print('Exception when calling AuthApi->authControllerVerifyMagicLink: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

