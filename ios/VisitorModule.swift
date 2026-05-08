import Foundation

@objc(VisitorModule)
class VisitorModule: NSObject {

  @objc
  func test() {
    print("VisitorModule connected")
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
