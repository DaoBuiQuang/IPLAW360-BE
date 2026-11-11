export const TIMESHEET_STAFF_ROLE = "timesheet_staff";

export const ACCOUNT_ROLES = ["admin", "staff", "trainee", "manager", TIMESHEET_STAFF_ROLE];

export const isTimesheetOnlyRole = (role) =>
    String(role || "").trim().toLowerCase() === TIMESHEET_STAFF_ROLE;

export const isPersonalTimesheetRole = (role) =>
    ["staff", "trainee", TIMESHEET_STAFF_ROLE].includes(String(role || "").trim().toLowerCase());

// Include only the lookup APIs needed by the Timesheet forms, not their management APIs.
const timesheetRequests = new Set([
    ...["case-options", "case-info", "list", "detail", "by-case", "summary", "contribution-check", "add", "edit", "delete", "kpi",
        "matter/list", "matter/activities", "matter/activity-detail"]
        .map((action) => `POST /timesheet/${action}`),
    "PUT /timesheet/edit",
    "DELETE /timesheet/delete",
    "PUT /timesheet/matter/activity-edit",
    "DELETE /timesheet/matter/activity-delete",
    ...["search", "list", "detail", "add", "restore"].map((action) => `POST /ds-cong-viec/${action}`),
    "PUT /ds-cong-viec/edit",
    "DELETE /ds-cong-viec/delete",
    "POST /staff/basiclist",
    "POST /staff/detail",
    "POST /country/list",
    "POST /partner/all",
    "POST /customers/by-name",
    "POST /logout",
    "POST /changepassword",
]);

export const canUseTimesheetApi = (method, path) => {
    const normalizedPath = String(path || "").toLowerCase().replace(/\/+$/, "");
    return timesheetRequests.has(`${String(method).toUpperCase()} ${normalizedPath}`);
};
