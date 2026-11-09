namespace ParaRota.Domain.Constants;

/// <summary>
/// Stabil, dilden bağımsız hata kodları. Backend <see cref="Dtos.ApiResponse{T}.ErrorCode"/>
/// alanında bu kodları döner; frontend kodu <c>errors:&lt;CODE&gt;</c> i18n anahtarına çevirir
/// (kullanıcının dilinde mesaj). <see cref="Dtos.ApiResponse{T}.Message"/> Türkçe fallback olarak
/// kalır (log + henüz map'lenmemiş istemci).
///
/// SÖZLEŞME:
/// - Kod = SCREAMING_SNAKE_CASE, hem backend constant değeri hem frontend i18n anahtarı.
/// - DİNAMİK mesajlar (string interpolation, FormatIdentityErrors, BuildLockoutMessage gibi) için
///   kod VERİLMEZ ya da verilse de frontend i18n anahtarı eklenmez → resolver Message'a düşer.
///   Statik/sabit mesajlar koda bağlanır.
/// - Yeni kod ekleyince 5 dile birden (tr/en/ar/es/de) errors.json'a eklenmeli.
/// </summary>
public static class ErrorCodes
{
    // ── Generic / cross-cutting ────────────────────────────────────────────
    public const string ValidationError = "VALIDATION_ERROR";       // 400 — ExceptionMiddleware (errors dict)
    public const string Unexpected = "UNEXPECTED";                  // 500 — beklenmeyen hata
    public const string HouseholdAccessDenied = "HOUSEHOLD_ACCESS_DENIED"; // 403 — "Bu aileye erişiminiz yok."
    public const string OnlyOwnerEdits = "ONLY_OWNER_EDITS";        // 403 — "Bu kaydı yalnız oluşturan düzenleyebilir."
    public const string OnlyOwnerDeletes = "ONLY_OWNER_DELETES";    // 403 — "Bu kaydı yalnız oluşturan silebilir."
    public const string UserNotFound = "USER_NOT_FOUND";            // 404 — "Kullanıcı bulunamadı."
    public const string AccountOwnsSharedHousehold = "ACCOUNT_OWNS_SHARED_HOUSEHOLD"; // 409 — hesap silmeden önce aile devri/silme
    public const string EmailSendFailed = "EMAIL_SEND_FAILED";      // 500 — "E-posta gönderilemedi."
    public const string PremiumRequired = "PREMIUM_REQUIRED";       // 403 — premium özellik; abonelik/deneme gerekli

    // ── Categories ─────────────────────────────────────────────────────────
    public const string CategoryNotFound = "CATEGORY_NOT_FOUND";              // 404
    public const string CategoryNameExists = "CATEGORY_NAME_EXISTS";          // 409 — "Bu isimde bir kategori zaten var."
    public const string CategorySystemImmutableEdit = "CATEGORY_SYSTEM_IMMUTABLE_EDIT";     // 400 — "Sistem kategorisi düzenlenemez."
    public const string CategorySystemImmutableDelete = "CATEGORY_SYSTEM_IMMUTABLE_DELETE"; // 400 — "Sistem kategorisi silinemez."
    public const string CategorySystemImmutableMerge = "CATEGORY_SYSTEM_IMMUTABLE_MERGE";   // 400 — "Sistem kategorisi birleştirilemez."
    public const string OnlyOwnerMerges = "ONLY_OWNER_MERGES";                // 403 — "Bu kaydı yalnız oluşturan birleştirebilir."
    public const string CategoryMergeSelf = "CATEGORY_MERGE_SELF";            // 400 — "Kategori kendisiyle birleştirilemez."
    public const string CategorySourceNotFound = "CATEGORY_SOURCE_NOT_FOUND"; // 404 — "Kaynak kategori bulunamadı."
    public const string CategoryTargetNotFound = "CATEGORY_TARGET_NOT_FOUND"; // 404 — "Hedef kategori bulunamadı."
    public const string CategoryMergeTypeMismatch = "CATEGORY_MERGE_TYPE_MISMATCH"; // 400 — "Yalnız aynı tipteki kategoriler birleştirilebilir."
    public const string CategoryMergeHasOthers = "CATEGORY_MERGE_HAS_OTHERS"; // 409 — başka üyelerin kayıtları var

    // ── Transactions ───────────────────────────────────────────────────────
    public const string TransactionNotFound = "TRANSACTION_NOT_FOUND";         // 404 — "Hareket bulunamadı."
    public const string TxCategoryTypeMismatch = "TX_CATEGORY_TYPE_MISMATCH";  // 400 — "Kategori türü ile hareket türü uyuşmuyor."
    public const string TransactionAlreadyInScope = "TRANSACTION_ALREADY_IN_SCOPE"; // 400 — "Hareket zaten bu kapsamda."

    // ── Budgets ────────────────────────────────────────────────────────────
    public const string BudgetNotFound = "BUDGET_NOT_FOUND";              // 404
    public const string BudgetExpenseOnly = "BUDGET_EXPENSE_ONLY";        // 400 — "Bütçe sadece gider kategorilerine konulabilir."
    public const string BudgetDuplicateMonth = "BUDGET_DUPLICATE_MONTH";  // 409 — "Bu ay bu kategoriye zaten bir bütçe var."

    // ── Goals ──────────────────────────────────────────────────────────────
    public const string GoalNotFound = "GOAL_NOT_FOUND";                  // 404 — "Hedef bulunamadı."

    // ── RecurringRules ─────────────────────────────────────────────────────
    public const string RecurringRuleNotFound = "RECURRING_RULE_NOT_FOUND";       // 404
    public const string RuleCategoryTypeMismatch = "RULE_CATEGORY_TYPE_MISMATCH";  // 400 — "Kategori türü ile kural türü uyuşmuyor."
    public const string OnlyOwnerRunsRule = "ONLY_OWNER_RUNS_RULE";                // 403 — "Bu kuralı yalnız oluşturan çalıştırabilir."
    public const string RuleNotDue = "RULE_NOT_DUE";                              // 400 — "Bu kural henüz çalıştırma zamanı gelmedi."

    // ── Debts ──────────────────────────────────────────────────────────────
    public const string DebtNotFound = "DEBT_NOT_FOUND";                          // 404 — "Borç kaydı bulunamadı."
    public const string DebtCompletedImmutable = "DEBT_COMPLETED_IMMUTABLE";      // 409 — "Tamamlanmış borç güncellenemez."
    public const string DebtInvalidStatusTransition = "DEBT_INVALID_STATUS_TRANSITION"; // 400 — "Geçersiz status geçişi."
    public const string DebtPaymentOnlyActive = "DEBT_PAYMENT_ONLY_ACTIVE";       // 409 — "Sadece aktif borç kayıtlarına ödeme eklenebilir."
    public const string OnlyOwnerAddsPayment = "ONLY_OWNER_ADDS_PAYMENT";         // 403 — "Bu kayda yalnız oluşturan ödeme ekleyebilir."
    public const string PaymentAmountPositive = "PAYMENT_AMOUNT_POSITIVE";        // 400 — "Ödeme tutarı sıfırdan büyük olmalı."
    public const string PaymentExceedsBalance = "PAYMENT_EXCEEDS_BALANCE";        // 400 — "Ödeme tutarı kalan bakiyeyi aşamaz."
    public const string DebtAutoPlanFailed = "DEBT_AUTO_PLAN_FAILED";             // 400 — DİNAMİK mesaj (i18n yok, Message fallback)

    // ── Households / Aile ──────────────────────────────────────────────────
    public const string HouseholdNotFound = "HOUSEHOLD_NOT_FOUND";                // 404 — "Aile bulunamadı."
    public const string HouseholdOnlyOwnerAdminEdit = "HOUSEHOLD_ONLY_OWNER_ADMIN_EDIT"; // 403 — "Yalnızca Owner veya Admin aileyi düzenleyebilir."
    public const string InviteSendForbidden = "INVITE_SEND_FORBIDDEN";            // 403 — "Davet göndermek için yetkiniz yok."
    public const string InviteEmailAlreadyMember = "INVITE_EMAIL_ALREADY_MEMBER"; // 409 — "Bu e-posta zaten ailenin aktif üyesi."
    public const string InviteAlreadyPending = "INVITE_ALREADY_PENDING";          // 409 — "Bu e-posta için bekleyen bir davet zaten var."
    public const string InviteInvalidOrExpired = "INVITE_INVALID_OR_EXPIRED";     // 400 — "Geçersiz veya süresi geçmiş davet."
    public const string InviteWrongUser = "INVITE_WRONG_USER";                    // 403 — "Bu davet başka kullanıcıya gönderilmiş."
    public const string InviteCancelForbidden = "INVITE_CANCEL_FORBIDDEN";        // 403 — "Daveti iptal etmek için yetkiniz yok."
    public const string InviteNotFound = "INVITE_NOT_FOUND";                      // 404 — "Davet bulunamadı."
    public const string InviteNotCancellable = "INVITE_NOT_CANCELLABLE";          // 400 — "Bu davet artık iptal edilemez."
    public const string InviteResendForbidden = "INVITE_RESEND_FORBIDDEN";        // 403 — "Daveti yeniden göndermek için yetkiniz yok."
    public const string InviteNotResendable = "INVITE_NOT_RESENDABLE";            // 409 — "Bu davet yeniden gönderilemez."
    public const string MemberCannotRemoveSelf = "MEMBER_CANNOT_REMOVE_SELF";     // 400 — "Kendinizi çıkaramazsınız..."
    public const string MemberRemoveForbidden = "MEMBER_REMOVE_FORBIDDEN";        // 403 — "Üye çıkarmak için yetkiniz yok."
    public const string MemberNotFound = "MEMBER_NOT_FOUND";                      // 404 — "Üye bulunamadı."
    public const string OwnerCannotBeRemoved = "OWNER_CANNOT_BE_REMOVED";         // 400 — "Owner çıkarılamaz..."
    public const string NotHouseholdMember = "NOT_HOUSEHOLD_MEMBER";              // 403 — "Bu ailenin üyesi değilsiniz."
    public const string OwnerMustTransferToLeave = "OWNER_MUST_TRANSFER_TO_LEAVE"; // 403 — "Sadece Owner ownership transferi ile ayrılabilir."
    public const string TargetMemberRequired = "TARGET_MEMBER_REQUIRED";          // 400 — "Hedef üye belirtilmeli."
    public const string TargetMemberNotFound = "TARGET_MEMBER_NOT_FOUND";         // 404 — "Hedef üye bulunamadı veya aktif değil."
    public const string OnlyOwnerAction = "ONLY_OWNER_ACTION";                    // 403 — "Bu işlemi yalnızca Owner yapabilir."
    public const string InvalidLeaveMode = "INVALID_LEAVE_MODE";                  // 400 — "Geçersiz çıkış modu."
    public const string CannotTransferToSelf = "CANNOT_TRANSFER_TO_SELF";         // 400 — "Kendinize sahiplik devredemezsiniz."
    public const string OnlyOwnerTransfers = "ONLY_OWNER_TRANSFERS";              // 403 — "Yalnızca Owner sahiplik devredebilir."
    public const string MemberRoleChangeForbidden = "MEMBER_ROLE_CHANGE_FORBIDDEN"; // 403 — "Üye rolünü değiştirmek için yetkiniz yok."
    public const string RoleAssignInvalid = "ROLE_ASSIGN_INVALID";               // 400 — "Bu endpoint ile yalnızca Admin veya Member rolü atanabilir."
    public const string OwnerRoleImmutable = "OWNER_ROLE_IMMUTABLE";              // 400 — "Owner rolü bu endpoint'le değiştirilemez."

    // ── Auth ───────────────────────────────────────────────────────────────
    public const string EmailAlreadyRegistered = "EMAIL_ALREADY_REGISTERED";      // 409 — "Bu e-posta zaten kayıtlı."
    public const string UsernameAlreadyRegistered = "USERNAME_ALREADY_REGISTERED"; // 409 — "Bu kullanıcı adı zaten kayıtlı."
    public const string CodeInvalidOrExpired = "CODE_INVALID_OR_EXPIRED";         // 400 — "Kod geçersiz veya süresi dolmuş."
    public const string CodeTooManyAttempts = "CODE_TOO_MANY_ATTEMPTS";          // 429 — çok fazla hatalı kod denemesi; kod iptal edildi, yeni kod istenmeli
    public const string InvalidCredentials = "INVALID_CREDENTIALS";              // 401 — "Kullanıcı adı veya parola hatalı."
    public const string AccountLocked = "ACCOUNT_LOCKED";                        // 423 — DİNAMİK (BuildLockoutMessage, dakika içerir) → Message fallback
    public const string EmailNotVerified = "EMAIL_NOT_VERIFIED";                 // 403 — "E-postanız doğrulanmadı."
    public const string GoogleAuthFailed = "GOOGLE_AUTH_FAILED";                 // 401 — Google ile giriş doğrulanamadı (token/kod/secret sorunu)
    public const string AppleAuthFailed = "APPLE_AUTH_FAILED";                   // 401 — Apple ile giriş doğrulanamadı
    public const string InvalidRefreshToken = "INVALID_REFRESH_TOKEN";           // 401 — "Geçersiz refresh token."
    public const string RefreshTokenExpired = "REFRESH_TOKEN_EXPIRED";           // 401 — "Refresh token süresi dolmuş veya iptal edilmiş."
    public const string IdentityError = "IDENTITY_ERROR";                        // 400 — DİNAMİK (FormatIdentityErrors) → Message fallback

    // ── Notifications ──────────────────────────────────────────────────────
    public const string NotificationNotFound = "NOTIFICATION_NOT_FOUND";          // 404 — "Bildirim bulunamadı."
    public const string TargetUserNotFound = "TARGET_USER_NOT_FOUND";             // 404 — "Hedef kullanıcı bulunamadı."
    public const string TargetAudienceEmpty = "TARGET_AUDIENCE_EMPTY";            // 400 — "Hedef kitle boş."

    // ── Devices ────────────────────────────────────────────────────────────
    public const string DeviceTokenEmpty = "DEVICE_TOKEN_EMPTY";                  // 400 — "Token boş olamaz."
    public const string DeviceTokenTooLong = "DEVICE_TOKEN_TOO_LONG";             // 400 — "Token çok uzun (max 512)."
    public const string DeviceNotFound = "DEVICE_NOT_FOUND";                      // 404 — "Cihaz bulunamadı."

    // ── Dashboard ──────────────────────────────────────────────────────────
    public const string InvalidMonth = "INVALID_MONTH";                          // 400 — "Geçersiz ay."
    public const string InvalidYear = "INVALID_YEAR";                            // 400 — "Geçersiz yıl."

    // ── Payroll / Kıdem ────────────────────────────────────────────────────
    public const string SeveranceGrossPositive = "SEVERANCE_GROSS_POSITIVE";     // 400 — "Brüt maaş pozitif olmalı."
    public const string SeveranceHireDateInvalid = "SEVERANCE_HIREDATE_INVALID"; // 400 — "Geçerli bir işe giriş tarihi gerekli."
    public const string SeveranceVacationInvalid = "SEVERANCE_VACATION_INVALID"; // 400 — "İzin günü 0-366 aralığında olmalı."
    public const string SeveranceCeilingInvalid = "SEVERANCE_CEILING_INVALID";   // 400 — "Geçerli bir tavan tutarı ve tarih gerekli."
    public const string SeveranceCeilingDateExists = "SEVERANCE_CEILING_DATE_EXISTS"; // 409 — "Bu yürürlük tarihi için bir tavan zaten var."
    public const string SeveranceCeilingNotFound = "SEVERANCE_CEILING_NOT_FOUND"; // 404 — "Tavan kaydı bulunamadı."

    // ── Investments / Portföy (Faz 6) ──────────────────────────────────────
    public const string HoldingNotFound = "HOLDING_NOT_FOUND";                   // 404 — "Varlık bulunamadı."
    public const string HoldingAmountOrQuantityRequired = "HOLDING_AMOUNT_OR_QUANTITY_REQUIRED"; // 400
    public const string MarketDataUnavailable = "MARKET_DATA_UNAVAILABLE";       // 502 — "Fiyat verisi alınamadı."
    public const string FundCodeRequired = "FUND_CODE_REQUIRED";                 // 400 — "Fon kodu girilmeli."
    public const string FundCodeInvalid = "FUND_CODE_INVALID";                   // 400 — "Geçersiz TEFAS fon kodu."

    // ── Receipts / OCR ─────────────────────────────────────────────────────
    public const string FileEmpty = "FILE_EMPTY";                                // 400 — "Dosya boş."
    public const string FileTooLarge = "FILE_TOO_LARGE";                         // 400 — "Dosya 4MB sınırını aşıyor."
    public const string FileTypeUnsupported = "FILE_TYPE_UNSUPPORTED";           // 415 — DİNAMİK ({ct}) → Message fallback
    public const string FileHeaderUnreadable = "FILE_HEADER_UNREADABLE";         // 400 — "Dosya başlığı okunamadı."
    public const string FileSignatureUnknown = "FILE_SIGNATURE_UNKNOWN";         // 415 — "Dosya imzası tanınmadı..."
    public const string FileMimeMismatch = "FILE_MIME_MISMATCH";                 // 415 — DİNAMİK ({ct},{detected}) → Message fallback
    public const string FileStreamResetFailed = "FILE_STREAM_RESET_FAILED";      // 500 — "Dosya stream sıfırlanamadı."
    public const string OcrNotConfigured = "OCR_NOT_CONFIGURED";                 // 503 — "... OCR yapılandırılmamış."
    public const string ReceiptNoData = "RECEIPT_NO_DATA";                       // 422 — "Fişten veri okunamadı."
    public const string ReceiptScanFailed = "RECEIPT_SCAN_FAILED";               // 500/502 — "Fiş taranamadı."
    public const string OcrServiceError = "OCR_SERVICE_ERROR";                   // dynamic status — "... OCR servisi hata verdi."

    // ── AI asistanı ────────────────────────────────────────────────────────
    public const string AiNotConfigured = "AI_NOT_CONFIGURED";                   // 503 — "AI servisi yapılandırılmamış."
    public const string AiServiceBusy = "AI_SERVICE_BUSY";                       // 429 — "AI servisi yoğun, biraz sonra tekrar dene."
    public const string AiServiceError = "AI_SERVICE_ERROR";                     // 502 — "AI servisi hata verdi."
    public const string AiParseFailed = "AI_PARSE_FAILED";                       // 422 — "Metinden bir işlem çıkarılamadı."
    public const string AiInsightsNoData = "AI_INSIGHTS_NO_DATA";                // 422 — "Bu ay için yeterli veri yok."

    // ── Taksit planı ───────────────────────────────────────────────────────
    public const string InstallmentRuleLocked = "INSTALLMENT_RULE_LOCKED";       // 400 — "Taksit planının tutarı, sıklığı ve başlangıcı değiştirilemez..."

    // ── Kira artışı ────────────────────────────────────────────────────────
    public const string RentDataUnavailable = "RENT_DATA_UNAVAILABLE";           // 502 — "TÜFE verisi alınamadı."

    // ── Enflasyon (paranın değeri) ─────────────────────────────────────────
    public const string InflationDataUnavailable = "INFLATION_DATA_UNAVAILABLE"; // 502 — "TÜFE verisi alınamadı."

    // ── Ortak kasa ─────────────────────────────────────────────────────────
    public const string SharedPotNotFound = "SHARED_POT_NOT_FOUND";               // 404
    public const string SharedPotInvalidInput = "SHARED_POT_INVALID_INPUT";       // 400
    public const string SharedPotMemberInUse = "SHARED_POT_MEMBER_IN_USE";        // 400 — masraf/ödemesi olan üye çıkarılamaz

    // ── Fiyat alarmı ───────────────────────────────────────────────────────
    public const string PriceAlarmNotFound = "PRICE_ALARM_NOT_FOUND";             // 404 — "Alarm bulunamadı."
    public const string PriceAlarmInvalidInput = "PRICE_ALARM_INVALID_INPUT";     // 400 — varlık/yön/eşik

    // ── Gün / Altın günü ───────────────────────────────────────────────────
    public const string GoldDayNotFound = "GOLDDAY_NOT_FOUND";                    // 404 — "Gün bulunamadı."
    public const string GoldDayMinMembers = "GOLDDAY_MIN_MEMBERS";                // 400 — "En az 2 üye gerekli."
    public const string GoldDayContributionNotFound = "GOLDDAY_CONTRIBUTION_NOT_FOUND"; // 404
    public const string GoldDayMeetingNotFound = "GOLDDAY_MEETING_NOT_FOUND";     // 404
    public const string GoldDayInvalidInput = "GOLDDAY_INVALID_INPUT";            // 400 — tutar/birim/ad

    // ── Abonelik kataloğu ──────────────────────────────────────────────────
    public const string SubscriptionsCategoryMissing = "SUBSCRIPTIONS_CATEGORY_MISSING";          // 500 — "Abonelikler kategorisi bulunamadı."
    public const string SubscriptionCatalogItemNotFound = "SUBSCRIPTION_CATALOG_ITEM_NOT_FOUND";  // 404 — "Katalog kaydı bulunamadı."
    public const string SubscriptionCatalogKeyExists = "SUBSCRIPTION_CATALOG_KEY_EXISTS";         // 409 — "Bu anahtarla bir katalog kaydı zaten var."
}
