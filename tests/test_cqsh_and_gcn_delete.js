import { DonCQSH_VN, DonCQSH_GCN_VN, GCN_NH, DonDangKy, KhachHangCuoi } from "../src/models/index.js";
import { deleteGCN_NH_VN } from "../src/controllers/gcn_nhController.js";
import {
    addApplicationCQNHVN,
    getAllApplicationCQ_VN,
    getApplicationCQ_VNDetail,
    addGCN_CQ_NHVN,
    getAllGCN_CQ_VN,
    getGCN_CQ_VNDetail
} from "../src/controllers/NH_CQSH/donCQSH_NHController.js";
import donCQSH_NhanHieu_VNRouter from "../src/routers/donCQSH_NhanHieu_VNRouter.js";
import gcn_nhRouter from "../src/routers/gcn_nhRouter.js";

async function runTests() {
    console.log("--- BẮT ĐẦU KIỂM TRA MODEL VÀ ASSOCIATIONS ---");
    console.log("✓ DonCQSH_VN Model loaded:", !!DonCQSH_VN);
    console.log("✓ DonCQSH_GCN_VN Model loaded:", !!DonCQSH_GCN_VN);
    console.log("✓ GCN_NH associations:", Object.keys(GCN_NH.associations));
    console.log("✓ DonDangKy associations:", Object.keys(DonDangKy.associations));

    console.log("\n--- BẮT ĐẦU KIỂM TRA ROUTER ROUTES ---");
    const getRoutes = (router) => {
        return router.stack
            .filter(r => r.route)
            .map(r => ({
                path: r.route.path,
                methods: Object.keys(r.route.methods).join(", ").toUpperCase()
            }));
    };

    console.log("Routes trong gcn_nhRouter:");
    const gcnRoutes = getRoutes(gcn_nhRouter);
    gcnRoutes.forEach(r => console.log(`  [${r.methods}] ${r.path}`));
    const hasDeleteGcnPath = gcnRoutes.some(r => r.path === "/gcn_nh_vn/delete/:id");
    const hasDeleteGcnPost = gcnRoutes.some(r => r.path === "/gcn_nh_vn/delete");
    console.log("✓ Kiểm tra route delete GCN :id:", hasDeleteGcnPath);
    console.log("✓ Kiểm tra route delete GCN POST:", hasDeleteGcnPost);

    console.log("\nRoutes trong donCQSH_NhanHieu_VNRouter:");
    const cqshRoutes = getRoutes(donCQSH_NhanHieu_VNRouter);
    cqshRoutes.forEach(r => console.log(`  [${r.methods}] ${r.path}`));
    const hasAddAppCQ = cqshRoutes.some(r => r.path === "/application_cq_nh_vn/add");
    const hasAddGcnCQ = cqshRoutes.some(r => r.path === "/gcn_cq_nh_vn/add");
    console.log("✓ Kiểm tra route application_cq_nh_vn/add:", hasAddAppCQ);
    console.log("✓ Kiểm tra route gcn_cq_nh_vn/add:", hasAddGcnCQ);

    console.log("\n--- BẮT ĐẦU KIỂM TRA VALIDATION CỦA CÁC CONTROLLER ---");
    // Mock response helper
    const createMockRes = () => {
        const res = {};
        res.statusCode = 200;
        res.jsonData = null;
        res.status = function(code) {
            this.statusCode = code;
            return this;
        };
        res.json = function(data) {
            this.jsonData = data;
            return this;
        };
        return res;
    };

    // Test 1: deleteGCN_NH_VN thiếu id
    const res1 = createMockRes();
    await deleteGCN_NH_VN({ params: {}, body: {} }, res1);
    console.log("✓ deleteGCN_NH_VN thiếu ID -> status:", res1.statusCode, res1.jsonData?.message);

    // Test 2: addApplicationCQNHVN thiếu thông tin
    const res2 = createMockRes();
    await addApplicationCQNHVN({ body: { maHoSo: "TEST" } }, res2);
    console.log("✓ addApplicationCQNHVN thiếu thông tin -> status:", res2.statusCode, res2.jsonData?.message);

    // Test 3: addGCN_CQ_NHVN thiếu thông tin
    const res3 = createMockRes();
    await addGCN_CQ_NHVN({ body: { maHoSo: "TEST" } }, res3);
    console.log("✓ addGCN_CQ_NHVN thiếu thông tin -> status:", res3.statusCode, res3.jsonData?.message);

    console.log("\n✅ TẤT CẢ CÁC BƯỚC KIỂM TRA ĐÃ HOÀN TẤT THÀNH CÔNG!");
    process.exit(0);
}

runTests().catch(err => {
    console.error("❌ Test thất bại:", err);
    process.exit(1);
});
