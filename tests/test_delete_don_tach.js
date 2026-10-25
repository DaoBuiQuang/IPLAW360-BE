import { sequelize } from "../src/config/db.js";
import { DonDangKy, DonTachNH_VN, KhachHangCuoi, TaiLieu, DonDK_SPDV } from "../src/models/index.js";
import { VuViec } from "../src/models/vuViecModel.js";
import { deleteApplication } from "../src/controllers/donDangKyController.js";

async function testDeleteDonTach() {
    try {
        await sequelize.authenticate();
        console.log("✅ Kết nối CSDL thành công!");

        const kh = await KhachHangCuoi.findOne();
        if (!kh) {
            console.log("❌ Không tìm thấy khách hàng nào để test!");
            return;
        }

        const nhanHieu = await sequelize.models.NhanHieu.findOne();
        const maNhanHieu = nhanHieu ? nhanHieu.maNhanHieu : 1;

        const maDonGoc = "TEST_GOC_TACH_" + Date.now();
        const maDonTach = "TEST_DON_TACH_" + Date.now();
        const maHoSo = "TEST_HS_TACH_" + Date.now();

        console.log(`\n1. Tạo đơn gốc [${maDonGoc}]...`);
        const donGoc = await DonDangKy.create({
            maDonDangKy: maDonGoc,
            maHoSo: maHoSo,
            maHoSoVuViec: maHoSo,
            soDon: "VN-GOC-9999",
            idKhachHang: kh.id,
            maNhanHieu: maNhanHieu,
            donGoc: 0,
            trangThaiDon: "Thẩm định hình thức",
            trangThaiVuViec: "1",
            loaiDon: 1,
        });

        console.log(`2. Tạo đơn tách mới [${maDonTach}]...`);
        const donTach = await DonDangKy.create({
            maDonDangKy: maDonTach,
            maHoSo: maHoSo + "-TD",
            maHoSoVuViec: maHoSo + "-TD",
            soDon: "VN-TACH-9999",
            idKhachHang: kh.id,
            maNhanHieu: maNhanHieu,
            donGoc: 0,
            trangThaiDon: "Đang giải quyết",
            trangThaiVuViec: "1",
            loaiDon: 3, // tách đơn
        });

        // Tạo bản ghi DonTachNH_VN
        console.log(`3. Tạo bản ghi DonTachNH_VN liên kết đơn tách và đơn gốc...`);
        const donTachRecord = await DonTachNH_VN.create({
            maDonDangKy: maDonTach,
            maDonDangKyGoc: maDonGoc,
            soDon: "VN-TACH-9999",
            dsNhomSPDV: "05, 35",
            ndTachDon: "Tách nhóm 05 và 35",
            lanTachDon: 1,
            ngayYeuCau: new Date(),
        });

        // Tạo SPDV cho đơn tách
        await DonDK_SPDV.create({
            maDonDangKy: maDonTach,
            maSPDV: "05",
            isAutoImport: false,
        }).catch(() => {});

        console.log("\n4. Test gọi deleteApplication để xóa ĐƠN TÁCH...");
        let responseCode = null;
        let responseBody = null;
        const mockReq = {
            body: {
                maDonDangKy: maDonTach,
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

        if (responseCode === 200 && responseBody.message === "Xóa đơn tách thành công!") {
            console.log("✅ PASS: deleteApplication trả về đúng message 'Xóa đơn tách thành công!'");
        } else {
            console.log("❌ FAIL: deleteApplication không trả về đúng kết quả mong đợi!");
        }

        console.log("\n5. Kiểm tra dữ liệu trong CSDL sau khi xóa đơn tách:");
        const checkDonTach = await DonDangKy.findByPk(maDonTach);
        const checkDonTachRecord = await DonTachNH_VN.findOne({ where: { maDonDangKy: maDonTach } });
        const checkSPDV = await DonDK_SPDV.findAll({ where: { maDonDangKy: maDonTach } });
        const checkDonGoc = await DonDangKy.findByPk(maDonGoc);

        console.log("- Đơn tách tồn tại trong DonDangKy:", checkDonTach !== null ? "Có (LỖI)" : "Không (ĐÃ XÓA ✅)");
        console.log("- Bản ghi DonTachNH_VN tồn tại:", checkDonTachRecord !== null ? "Có (LỖI)" : "Không (ĐÃ XÓA ✅)");
        console.log("- SPDV của đơn tách còn lại:", checkSPDV.length, checkSPDV.length === 0 ? "(ĐÃ DỌN DẸP SẠCH ✅)" : "(CHƯA DỌN DẸP ❌)");
        console.log("- Đơn gốc còn nguyên vẹn:", checkDonGoc !== null ? "Có ✅" : "Không ❌");

        console.log("\n6. Test thử xóa ĐƠN GỐC khi ĐANG CÓ ĐƠN TÁCH CON...");
        // Tạo lại 1 đơn tách con liên kết tới đơn gốc
        const maDonTach2 = "TEST_TACH_2_" + Date.now();
        const donTach2 = await DonDangKy.create({
            maDonDangKy: maDonTach2,
            maHoSo: maHoSo + "-TD2",
            maHoSoVuViec: maHoSo + "-TD2",
            soDon: "VN-TACH-2",
            idKhachHang: kh.id,
            maNhanHieu: maNhanHieu,
            donGoc: 0,
            trangThaiDon: "Đang giải quyết",
            trangThaiVuViec: "1",
            loaiDon: 3,
        });
        await DonTachNH_VN.create({
            maDonDangKy: maDonTach2,
            maDonDangKyGoc: maDonGoc,
            soDon: "VN-TACH-2",
            lanTachDon: 1,
            ngayYeuCau: new Date(),
        });

        // Thử xóa đơn gốc
        let responseCodeGoc = null;
        let responseBodyGoc = null;
        await deleteApplication(
            { body: { maDonDangKy: maDonGoc } },
            {
                status: (code) => {
                    responseCodeGoc = code;
                    return { json: (d) => { responseBodyGoc = d; return d; } };
                }
            }
        );
        console.log("Xóa đơn gốc khi có đơn tách -> Status:", responseCodeGoc, "Message:", responseBodyGoc?.message);
        if (responseCodeGoc === 400 && responseBodyGoc?.message?.includes("đơn tách")) {
            console.log("✅ PASS: Controller đã chặn xóa đơn gốc và thông báo rõ ràng cho người dùng!");
        } else {
            console.log("❌ FAIL: Không chặn đúng như kỳ vọng!");
        }

        // Dọn dẹp cả 2 đơn test
        await DonTachNH_VN.destroy({ where: { maDonDangKy: maDonTach2 } });
        await donTach2.destroy();
        if (checkDonGoc) {
            await checkDonGoc.destroy();
            console.log("\n✅ Đã dọn dẹp toàn bộ dữ liệu test thành công!");
        }

    } catch (err) {
        console.error("❌ Lỗi kiểm tra:", err);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

testDeleteDonTach();
