import { sequelize } from "../src/config/db.js";
import { DonDangKy, DonCQSH_VN, KhachHangCuoi, NhanSu_VuViec, TaiLieu, DonDK_SPDV } from "../src/models/index.js";
import { VuViec } from "../src/models/vuViecModel.js";
import { deleteApplication } from "../src/controllers/donDangKyController.js";
import { Op } from "sequelize";

async function testCQSHDonLifecycle() {
    try {
        await sequelize.authenticate();
        console.log("✅ Kết nối CSDL thành công!");

        // Lấy 1 khách hàng có sẵn để gán
        const kh = await KhachHangCuoi.findOne();
        if (!kh) {
            console.log("❌ Không tìm thấy khách hàng nào để test!");
            return;
        }

        const nhanHieu = await sequelize.models.NhanHieu.findOne();
        const maNhanHieu = nhanHieu ? nhanHieu.maNhanHieu : 1;

        const maDonCu = "TEST_DON_CU_" + Date.now();
        const maDonMoi = "TEST_DON_MOI_" + Date.now();
        const maHoSo = "TEST_HS_" + Date.now();

        console.log(`\n1. Tạo đơn gốc cũ [${maDonCu}]...`);
        const donCu = await DonDangKy.create({
            maDonDangKy: maDonCu,
            maHoSo: maHoSo,
            maHoSoVuViec: maHoSo,
            soDon: "VN-TEST-12345",
            idKhachHang: kh.id,
            maNhanHieu: maNhanHieu,
            donGoc: 0,
            trangThaiDon: "Thẩm định hình thức",
            trangThaiVuViec: "1",
            loaiDon: 1,
        });

        console.log(`2. Giả lập chuyển quyền sang đơn mới [${maDonMoi}]...`);
        const donMoi = await DonDangKy.create({
            maDonDangKy: maDonMoi,
            maHoSo: maHoSo + "_CQ",
            maHoSoVuViec: maHoSo + "_CQ",
            soDon: "VN-TEST-CQ-12345",
            idKhachHang: kh.id,
            maNhanHieu: maNhanHieu,
            donGoc: 0,
            trangThaiDon: "Đang giải quyết",
            trangThaiVuViec: "1",
            loaiDon: 3,
        });

        // Tạo bản ghi chuyển quyền
        const donCQ = await DonCQSH_VN.create({
            maHoSo: maHoSo + "_CQ",
            maDonDangKy: maDonMoi,
            idKhachHang: kh.id,
            maDonDangKyGoc: maDonCu,
            soDon: "VN-TEST-CQ-12345",
            lanChuyenQuyen: 1,
            ngayYeuCau: new Date(),
        });

        // Cập nhật đơn cũ sang trạng thái Đã chuyển quyền
        await donCu.update({
            donGoc: 1,
            trangThaiVuViec: "Đã chuyển quyền",
            trangThaiDon: "Đã chuyển quyền",
        });

        console.log("3. Kiểm tra logic lọc danh sách (getAllApplication)...");
        // Kiểm tra filter logic
        const whereCondition = {
            trangThaiDon: { [Op.ne]: "Đã chuyển quyền" },
            trangThaiVuViec: { [Op.ne]: "Đã chuyển quyền" },
            [Op.and]: [
                {
                    [Op.not]: {
                        [Op.and]: [
                            { donGoc: 1 },
                            {
                                [Op.or]: [
                                    { trangThaiVuViec: "Đã chuyển quyền" },
                                    { trangThaiDon: "Đã chuyển quyền" }
                                ]
                            }
                        ]
                    }
                }
            ]
        };

        const checkDonCuAn = await DonDangKy.findOne({
            where: {
                maDonDangKy: maDonCu,
                ...whereCondition
            }
        });
        if (!checkDonCuAn) {
            console.log("✅ PASS: Đơn cũ đã chuyển quyền đã bị ẩn khỏi danh sách thành công!");
        } else {
            console.log("❌ FAIL: Đơn cũ vẫn xuất hiện trong danh sách!");
        }

        const checkDonMoiHien = await DonDangKy.findOne({
            where: {
                maDonDangKy: maDonMoi,
                ...whereCondition
            }
        });
        if (checkDonMoiHien) {
            console.log("✅ PASS: Đơn mới nhận chuyển quyền hiển thị bình thường trên danh sách!");
        } else {
            console.log("❌ FAIL: Đơn mới không hiển thị!");
        }

        console.log("\n4. Test gọi deleteApplication để xóa đơn mới và hoàn trả quyền...");
        let responseCode = null;
        let responseBody = null;
        const mockReq = {
            body: {
                maDonDangKy: maDonMoi
            }
        };
        const mockRes = {
            status: (code) => {
                responseCode = code;
                return {
                    json: (data) => {
                        responseBody = data;
                        return data;
                    }
                };
            }
        };

        await deleteApplication(mockReq, mockRes);
        console.log("Response status:", responseCode);
        console.log("Response body:", responseBody);

        if (responseCode === 200 && responseBody.message === "Đã xóa đơn chuyển quyền và hoàn trả đơn lại cho chủ cũ thành công!") {
            console.log("✅ PASS: deleteApplication trả về đúng message yêu cầu!");
        } else {
            console.log("❌ FAIL: deleteApplication không trả về đúng kết quả mong đợi!");
        }

        // Kiểm tra database sau khi xóa
        const donMoiCheck = await DonDangKy.findByPk(maDonMoi);
        const donCQCheck = await DonCQSH_VN.findOne({ where: { maDonDangKy: maDonMoi } });
        const donCuCheck = await DonDangKy.findByPk(maDonCu);

        console.log("\n5. Kiểm tra tính toàn vẹn dữ liệu sau khi xóa:");
        console.log("- Đơn mới tồn tại:", donMoiCheck !== null ? "Có (LỖI)" : "Không (ĐÃ XÓA ✅)");
        console.log("- Bản ghi DonCQSH_VN tồn tại:", donCQCheck !== null ? "Có (LỖI)" : "Không (ĐÃ XÓA ✅)");
        console.log("- Đơn cũ được phục hồi:");
        console.log("  + donGoc:", donCuCheck.donGoc, donCuCheck.donGoc === 0 ? "✅" : "❌");
        console.log("  + trangThaiDon:", donCuCheck.trangThaiDon, donCuCheck.trangThaiDon === "Thẩm định hình thức" ? "✅" : "❌");
        console.log("  + trangThaiVuViec:", donCuCheck.trangThaiVuViec, donCuCheck.trangThaiVuViec === "1" ? "✅" : "❌");

        // Dọn dẹp đơn cũ test
        await donCuCheck.destroy();
        console.log("\n✅ Đã dọn dẹp dữ liệu test thành công!");

    } catch (err) {
        console.error("❌ Lỗi kiểm tra:", err);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

testCQSHDonLifecycle();
