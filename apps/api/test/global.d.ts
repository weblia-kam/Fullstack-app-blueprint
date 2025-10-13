declare namespace jest {
  interface Matchers<R> {
    toSatisfyApiSpec(): R;
  }
}
