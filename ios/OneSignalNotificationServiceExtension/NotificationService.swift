import UserNotifications
import OneSignalExtension

class NotificationService: UNNotificationServiceExtension {

    var contentHandler: ((UNNotificationContent) -> Void)?
    var bestAttemptContent: UNMutableNotificationContent?
    var receivedRequest: UNNotificationRequest!

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {

        self.receivedRequest = request
        self.contentHandler = contentHandler
        self.bestAttemptContent =
            (request.content.mutableCopy() as? UNMutableNotificationContent)

        guard let bestAttemptContent = bestAttemptContent else {
            return
        }

        // Read custom payload
        let userInfo = bestAttemptContent.userInfo
        let customData = userInfo["custom"] as? [String: Any]
        let additionalData = customData?["a"] as? [String: Any]

        let type = (additionalData?["type"] as? String)?.uppercased()
        let title = bestAttemptContent.title
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()

        // STAFF notification sound
        if type == "STAFF" {
            bestAttemptContent.sound =
                UNNotificationSound(
                    named: UNNotificationSoundName("door_bell.wav")
                )
        }

        // Visitor notification sound + actions
        else if title == "add visit" {

            bestAttemptContent.sound =
                UNNotificationSound(
                    named: UNNotificationSoundName("visitor_alert.wav")
                )

            bestAttemptContent.categoryIdentifier = "VISITOR_ACTIONS"
        }

        // OneSignal processing
        OneSignalExtension.didReceiveNotificationExtensionRequest(
            self.receivedRequest,
            with: bestAttemptContent,
            withContentHandler: self.contentHandler
        )
    }

    override func serviceExtensionTimeWillExpire() {

        if let contentHandler = contentHandler,
           let bestAttemptContent = bestAttemptContent {

            OneSignalExtension.serviceExtensionTimeWillExpireRequest(
                self.receivedRequest,
                with: self.bestAttemptContent
            )

            contentHandler(bestAttemptContent)
        }
    }
}
