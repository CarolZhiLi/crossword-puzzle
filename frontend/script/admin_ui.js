document.addEventListener('DOMContentLoaded', () => {
    // Ensure the translation function is loaded
    if (typeof t !== 'function') {
        console.error('Translation function "t" is not loaded. Make sure lang/en/en.js is included.');
        return;
    }

    /**
     * An array of element IDs that match their corresponding language keys in en.js.
     */
    const translations = [
        "adminHeader", "range_all_time", "range_today", "refreshBtn", "exportBtn", "resetCallsBtn",
        "resetTodayBtn", "backBtn", "api_calls_subtitle", "number_col", "username_col", "email_col",
        "calls_col", "tokens_col", "games_col", "actions_col", "api_usage_subtitle", "method_col",
        "endpoint_col", "request_col", "apiStatsPrevBtn", "apiStatsNextBtn"
    ];

    // Iterate over the array and update the text content of each element
    for (const id of translations) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = t(id);
        }
    }
});
