
import { DoiTac } from "../models/doiTacModel.js";
import { KhachHangCuoi } from "../models/khanhHangCuoiModel.js";
import { TuVanChung_VN } from "../models/tuVanChung_VNModel.js";
import { TuVanChung_KH } from "../models/tuVanChung_KHModel.js";
import { Sequelize } from "sequelize";
import { VuViec } from "../models/vuViecModel.js";
export const getGeneralAdvices_VN = async (req, res) => {
    try {
        const { keyword, pageIndex = 1, pageSize = 20 } = req.body;
        const offset = (pageIndex - 1) * pageSize;

        // Điều kiện lọc
        const whereCondition = {}; // chỉ lấy tư vấn VN
        if (keyword) {
            whereCondition.noiDung = { [Op.like]: `%${keyword}%` };
        }

        // Đếm tổng số bản ghi
        const totalItems = await TuVanChung_VN.count({ where: whereCondition });

        // Lấy dữ liệu chính
        const generalAdvices = await TuVanChung_VN.findAll({
            where: whereCondition,
            attributes: [
                "id",
                "maHoSo",
                "idKhachHang",
                "idDoiTac",
                "noiDung",
                "deadline",
                "softDeadline",
                "ngayXuLy",
                "ngayHoanThanh",
                "trangThai",
                "ghiChu"
            ],
            include: [
                {
                    model: KhachHangCuoi,
                    as: "KhachHangCuoi",
                    attributes: ["tenKhachHang"],
                },
                {
                    model: DoiTac,
                    as: "DoiTac",
                    attributes: ["tenDoiTac", "maQuocGia", "diaChi", "sdt", "nguoiLienHe", "email", "moTa"],
                },
            ],
            limit: pageSize,
            offset: offset,
            order: [["id", "DESC"]],
        });

        if (!generalAdvices.length) {
            return res.status(404).json({ message: "Không có tư vấn chung nào phù hợp" });
        }

        // Chuẩn hoá dữ liệu trả về
        const result = generalAdvices.map(item => ({
            id: item.id,
            maHoSo: item.maHoSo,
            tenKhachHang: item.KhachHangCuoi?.tenKhachHang || "",
            tenDoiTac: item.DoiTac?.tenDoiTac || "",
            maQuocGia: item.DoiTac?.maQuocGia || "",
            diaChi: item.DoiTac?.diaChi || "",
            sdt: item.DoiTac?.sdt || "",
            nguoiLienHe: item.DoiTac?.nguoiLienHe || "",
            email: item.DoiTac?.email || "",
            moTa: item.DoiTac?.moTa || "",
            noiDung: item.noiDung,
            deadline: item.deadline,
            softDeadline: item.softDeadline,
            ngayXuLy: item.ngayXuLy,
            ngayHoanThanh: item.ngayHoanThanh,
            trangThai: item.trangThai,
            ghiChu: item.ghiChu,
        }));

        // Trả kết quả
        res.status(200).json({
            data: result,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / pageSize),
                pageIndex: Number(pageIndex),
                pageSize: Number(pageSize)
            }
        });
    } catch (error) {
        console.error("Lỗi khi lấy tư vấn chung:", error);
        res.status(500).json({ message: error.message });
    }
};
export const getGeneralAdvices_KH = async (req, res) => {
    try {
        const { keyword, pageIndex = 1, pageSize = 20 } = req.body;
        const offset = (pageIndex - 1) * pageSize;

        // Điều kiện lọc
        const whereCondition = {}; // chỉ lấy tư vấn VN
        if (keyword) {
            whereCondition.noiDung = { [Op.like]: `%${keyword}%` };
        }

        // Đếm tổng số bản ghi
        const totalItems = await TuVanChung_KH.count({ where: whereCondition });

        // Lấy dữ liệu chính
        const generalAdvices = await TuVanChung_KH.findAll({
            where: whereCondition,
            attributes: [
                "id",
                "maHoSo",
                "idKhachHang",
                "idDoiTac",
                "noiDung",
                "deadline",
                "softDeadline",
                "ngayXuLy",
                "ngayHoanThanh",
                "trangThai",
                "ghiChu"
            ],
            include: [
                {
                    model: KhachHangCuoi,
                    as: "KhachHangCuoi",
                    attributes: ["tenKhachHang"],
                },
                {
                    model: DoiTac,
                    as: "DoiTac",
                    attributes: ["tenDoiTac", "maQuocGia", "diaChi", "sdt", "nguoiLienHe", "email", "moTa"],
                },
            ],
            limit: pageSize,
            offset: offset,
            order: [["id", "DESC"]],
        });

        if (!generalAdvices.length) {
            return res.status(404).json({ message: "Không có tư vấn chung nào phù hợp" });
        }

        // Chuẩn hoá dữ liệu trả về
        const result = generalAdvices.map(item => ({
            id: item.id,
            maHoSo: item.maHoSo,
            tenKhachHang: item.KhachHangCuoi?.tenKhachHang || "",
            tenDoiTac: item.DoiTac?.tenDoiTac || "",
            maQuocGia: item.DoiTac?.maQuocGia || "",
            diaChi: item.DoiTac?.diaChi || "",
            sdt: item.DoiTac?.sdt || "",
            nguoiLienHe: item.DoiTac?.nguoiLienHe || "",
            email: item.DoiTac?.email || "",
            moTa: item.DoiTac?.moTa || "",
            noiDung: item.noiDung,
            deadline: item.deadline,
            softDeadline: item.softDeadline,
            ngayXuLy: item.ngayXuLy,
            ngayHoanThanh: item.ngayHoanThanh,
            trangThai: item.trangThai,
            ghiChu: item.ghiChu,
        }));

        // Trả kết quả
        res.status(200).json({
            data: result,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / pageSize),
                pageIndex: Number(pageIndex),
                pageSize: Number(pageSize)
            }
        });
    } catch (error) {
        console.error("Lỗi khi lấy tư vấn chung:", error);
        res.status(500).json({ message: error.message });
    }
};
export const addGeneralAdvice_VN = async (req, res) => {

    const transaction = await TuVanChung_VN.sequelize.transaction();
    try {
        const { maHoSo, idKhachHang, idDoiTac, noiDung, deadline, softDeadline, ngayXuLy, ngayHoanThanh, trangThai, ghiChu, vuViecs } = req.body;

        if (!maHoSo || !idKhachHang || !noiDung) {
            await transaction.rollback();
            return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin" });
        }

        const existingGeneralAdvice = await TuVanChung_VN.findOne({ where: { maHoSo } });
        if (existingGeneralAdvice) {
            await transaction.rollback();
            return res.status(409).json({ message: "Mã hồ sơ đã tồn tại!" });
        }

        const newGeneralAdvice = await TuVanChung_VN.create(
            { maHoSo, idKhachHang, idDoiTac, noiDung, deadline, softDeadline, ngayXuLy, ngayHoanThanh, trangThai, ghiChu },
            { transaction }
        );

        for (const vuViec of vuViecs) {

            let ngayXuatBill = null;
            let maNguoiXuatBill = null;
            if (vuViec.xuatBill === true) {
                ngayXuatBill = new Date();
                maNguoiXuatBill = req.user?.maNhanSu; // hoặc ông define sao tuỳ backend ông đang làm
            }

            await VuViec.create(
                {
                    tenVuViec: vuViec.tenVuViec,
                    moTa: vuViec.moTa,
                    trangThai: vuViec.trangThai,
                    maHoSo,
                    maDon: newGeneralAdvice.id,
                    maQuocGiaVuViec: "VN",
                    ngayTaoVV: new Date(),
                    maNguoiXuLy: vuViec.maNguoiXuLy,
                    tenBang: "TuVanChung_VN",
                    deadline: vuViec.deadline,
                    softDeadline: vuViec.softDeadline,
                    xuatBill: vuViec.xuatBill,
                    ngayXuatBill,
                    maNguoiXuatBill,
                    soTien: vuViec.soTien,
                    loaiTienTe: vuViec.loaiTienTe,
                    isMainCase: vuViec.isMainCase,
                    idKhachHang: idKhachHang,
                    idDoiTac:idDoiTac,
                },
                { transaction }
            );
        }

        await transaction.commit();
        res.status(201).json(newGeneralAdvice);

    } catch (error) {
        await transaction.rollback();

        if (error instanceof Sequelize.UniqueConstraintError) {
            return res.status(409).json({ message: "Dữ liệu đã tồn tại" });
        }

        return res.status(500).json({ message: error.message });
    }
};
export const addGeneralAdvice_KH = async (req, res) => {

    const transaction = await TuVanChung_KH.sequelize.transaction();
    try {
        const { maHoSo, idKhachHang, idDoiTac, noiDung, deadline, softDeadline, ngayXuLy, ngayHoanThanh, trangThai, ghiChu, vuViecs } = req.body;

        if (!maHoSo || !idKhachHang || !noiDung) {
            await transaction.rollback();
            return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin" });
        }

        const existingGeneralAdvice = await TuVanChung_KH.findOne({ where: { maHoSo } });
        if (existingGeneralAdvice) {
            await transaction.rollback();
            return res.status(409).json({ message: "Mã hồ sơ đã tồn tại!" });
        }

        const newGeneralAdvice = await TuVanChung_KH.create(
            { maHoSo, idKhachHang, idDoiTac, noiDung, deadline, softDeadline, ngayXuLy, ngayHoanThanh, trangThai, ghiChu },
            { transaction }
        );

        for (const vuViec of vuViecs) {

            let ngayXuatBill = null;
            let maNguoiXuatBill = null;
            if (vuViec.xuatBill === true) {
                ngayXuatBill = new Date();
                maNguoiXuatBill = req.user?.maNhanSu; // hoặc ông define sao tuỳ backend ông đang làm
            }

            await VuViec.create(
                {
                    tenVuViec: vuViec.tenVuViec,
                    moTa: vuViec.moTa,
                    trangThai: vuViec.trangThai,
                    maHoSo,
                    maDon: newGeneralAdvice.id,
                    maQuocGiaVuViec: "KH",
                    ngayTaoVV: new Date(),
                    maNguoiXuLy: vuViec.maNguoiXuLy,
                    tenBang: "TuVanChung_KH",
                    deadline: vuViec.deadline,
                    softDeadline: vuViec.softDeadline,
                    xuatBill: vuViec.xuatBill,
                    ngayXuatBill,
                    maNguoiXuatBill,
                    soTien: vuViec.soTien,
                    loaiTienTe: vuViec.loaiTienTe,
                    isMainCase: vuViec.isMainCase,
                    idKhachHang: idKhachHang,
                    idDoiTac:idDoiTac,
                },
                { transaction }
            );
        }

        await transaction.commit();
        res.status(201).json(newGeneralAdvice);

    } catch (error) {
        await transaction.rollback();

        if (error instanceof Sequelize.UniqueConstraintError) {
            return res.status(409).json({ message: "Dữ liệu đã tồn tại" });
        }

        return res.status(500).json({ message: error.message });
    }
};
export const getGeneralAdviceDetail_VN = async (req, res) => {
    try {
        const { id } = req.body;

        const data = await TuVanChung_VN.findOne({
            where: { id },
            include: [
                {
                    model: KhachHangCuoi,
                    as: "KhachHangCuoi",
                    attributes: ["tenKhachHang"],
                },
                {
                    model: DoiTac,
                    as: "DoiTac",
                    attributes: ["tenDoiTac","maQuocGia","diaChi","sdt","nguoiLienHe","email","moTa"],
                }
            ]
        });

        if(!data) return res.status(404).json({message:"Không tìm thấy hồ sơ"});

        const plainGL = data.toJSON();

        // lấy vu viec theo maHoSo
        const vuViecs = await VuViec.findAll({
            where: { maHoSo: plainGL.maHoSo },
            attributes: ["id","tenVuViec","moTa","deadline","softDeadline","xuatBill","ngayXuatBill","maNguoiXuatBill","soTien","loaiTienTe","isMainCase","maNguoiXuLy", "maHoSo"],
            order: [["id","DESC"]]
        });

        plainGL.vuViecs = vuViecs.map(v => v.toJSON());

        return res.status(200).json(plainGL);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};
export const getGeneralAdviceDetail_KH = async (req, res) => {
    try {
        const { id } = req.body;

        const data = await TuVanChung_KH.findOne({
            where: { id },
            include: [
                {
                    model: KhachHangCuoi,
                    as: "KhachHangCuoi",
                    attributes: ["tenKhachHang"],
                },
                {
                    model: DoiTac,
                    as: "DoiTac",
                    attributes: ["tenDoiTac","maQuocGia","diaChi","sdt","nguoiLienHe","email","moTa"],
                }
            ]
        });

        if(!data) return res.status(404).json({message:"Không tìm thấy hồ sơ"});

        const plainGL = data.toJSON();

        // lấy vu viec theo maHoSo
        const vuViecs = await VuViec.findAll({
            where: { maHoSo: plainGL.maHoSo },
            attributes: ["id","tenVuViec","moTa","deadline","softDeadline","xuatBill","ngayXuatBill","maNguoiXuatBill","soTien","loaiTienTe","isMainCase","maNguoiXuLy",  "maHoSo"],
            order: [["id","DESC"]]
        });

        plainGL.vuViecs = vuViecs.map(v => v.toJSON());

        return res.status(200).json(plainGL);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

export const updateGeneralAdvice_VN = async (req,res)=>{
    const transaction = await TuVanChung_VN.sequelize.transaction();
    try{
        const { id } = req.body;
        const { maHoSo, idKhachHang, idDoiTac, noiDung, deadline, softDeadline, ngayXuLy, ngayHoanThanh, trangThai, ghiChu, vuViecs } = req.body;

        const existing = await TuVanChung_VN.findByPk(id);
        if(!existing){
            await transaction.rollback();
            return res.status(404).json({message:"Không tìm thấy hồ sơ"});
        }

        await existing.update(
            { maHoSo, idKhachHang, idDoiTac, noiDung, deadline, softDeadline, ngayXuLy, ngayHoanThanh, trangThai, ghiChu },
            { transaction }
        );

        // xử lý vu viec
        if(Array.isArray(vuViecs)){
            const vuViecsHienTai = await VuViec.findAll({ where:{ maHoSo }, transaction });

            const idVuViecsTruyenLen = vuViecs.filter(v=>v.id).map(v=>v.id);

            // xoá những cái FE xoá
            for(const vvOld of vuViecsHienTai){
                if(!idVuViecsTruyenLen.includes(vvOld.id)){
                    await vvOld.destroy({ transaction });
                }
            }

            for(const vv of vuViecs){
                let ngayXuatBill = null;
                let maNguoiXuatBill = null;
                if(vv.xuatBill === true){
                    ngayXuatBill = new Date();
                    maNguoiXuatBill = req.user?.maNhanSu;
                }

                // UPDATE
                if(vv.id){
                    await VuViec.update(
                        {
                            tenVuViec: vv.tenVuViec,
                            moTa: vv.moTa,
                            trangThai: vv.trangThai,
                            deadline: vv.deadline,
                            softDeadline: vv.softDeadline,
                            xuatBill: vv.xuatBill,
                            ngayXuatBill,
                            maNguoiXuatBill,
                            soTien: vv.soTien,
                            loaiTienTe: vv.loaiTienTe,
                            isMainCase: vv.isMainCase,
                            maNguoiXuLy: vv.maNguoiXuLy,
                        },
                        { where:{ id:vv.id }, transaction }
                    );
                }
                else{ // CREATE mới
                    await VuViec.create(
                        {
                            tenVuViec: vv.tenVuViec,
                            moTa: vv.moTa,
                            trangThai: vv.trangThai,
                            maHoSo,
                            maDon: id,
                            maQuocGiaVuViec:"VN",
                            ngayTaoVV: new Date(),
                            maNguoiXuLy: vv.maNguoiXuLy,
                            tenBang:"TuVanChung_VN",
                            deadline: vv.deadline,
                            softDeadline: vv.softDeadline,
                            xuatBill: vv.xuatBill,
                            ngayXuatBill,
                            maNguoiXuatBill,
                            soTien: vv.soTien,
                            loaiTienTe: vv.loaiTienTe,
                            isMainCase: vv.isMainCase,
                            idKhachHang,
                            idDoiTac
                        },
                        { transaction }
                    );
                }
            }
        }

        await transaction.commit();
        res.status(200).json(existing);

    }catch(e){
        await transaction.rollback();
        res.status(500).json({message:e.message});
    }
};
export const updateGeneralAdvice_KH = async (req,res)=>{
    const transaction = await TuVanChung_KH.sequelize.transaction();
    try{
        const { id } = req.body;
        const { maHoSo, idKhachHang, idDoiTac, noiDung, deadline, softDeadline, ngayXuLy, ngayHoanThanh, trangThai, ghiChu, vuViecs } = req.body;

        const existing = await TuVanChung_KH.findByPk(id);
        if(!existing){
            await transaction.rollback();
            return res.status(404).json({message:"Không tìm thấy hồ sơ"});
        }

        await existing.update(
            { maHoSo, idKhachHang, idDoiTac, noiDung, deadline, softDeadline, ngayXuLy, ngayHoanThanh, trangThai, ghiChu },
            { transaction }
        );

        // xử lý vu viec
        if(Array.isArray(vuViecs)){
            const vuViecsHienTai = await VuViec.findAll({ where:{ maHoSo }, transaction });

            const idVuViecsTruyenLen = vuViecs.filter(v=>v.id).map(v=>v.id);

            // xoá những cái FE xoá
            for(const vvOld of vuViecsHienTai){
                if(!idVuViecsTruyenLen.includes(vvOld.id)){
                    await vvOld.destroy({ transaction });
                }
            }

            for(const vv of vuViecs){
                let ngayXuatBill = null;
                let maNguoiXuatBill = null;
                if(vv.xuatBill === true){
                    ngayXuatBill = new Date();
                    maNguoiXuatBill = req.user?.maNhanSu;
                }

                // UPDATE
                if(vv.id){
                    await VuViec.update(
                        {
                            tenVuViec: vv.tenVuViec,
                            moTa: vv.moTa,
                            trangThai: vv.trangThai,
                            deadline: vv.deadline,
                            softDeadline: vv.softDeadline,
                            xuatBill: vv.xuatBill,
                            ngayXuatBill,
                            maNguoiXuatBill,
                            soTien: vv.soTien,
                            loaiTienTe: vv.loaiTienTe,
                            isMainCase: vv.isMainCase,
                            maNguoiXuLy: vv.maNguoiXuLy,
                        },
                        { where:{ id:vv.id }, transaction }
                    );
                }
                else{ // CREATE mới
                    await VuViec.create(
                        {
                            tenVuViec: vv.tenVuViec,
                            moTa: vv.moTa,
                            trangThai: vv.trangThai,
                            maHoSo,
                            maDon: id,
                            maQuocGiaVuViec:"KH",
                            ngayTaoVV: new Date(),
                            maNguoiXuLy: vv.maNguoiXuLy,
                            tenBang:"TuVanChung_KH",
                            deadline: vv.deadline,
                            softDeadline: vv.softDeadline,
                            xuatBill: vv.xuatBill,
                            ngayXuatBill,
                            maNguoiXuatBill,
                            soTien: vv.soTien,
                            loaiTienTe: vv.loaiTienTe,
                            isMainCase: vv.isMainCase,
                            idKhachHang,
                            idDoiTac
                        },
                        { transaction }
                    );
                }
            }
        }

        await transaction.commit();
        res.status(200).json(existing);

    }catch(e){
        await transaction.rollback();
        res.status(500).json({message:e.message});
    }
};
