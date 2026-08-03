import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";

export const dataHSVVExcel_ChuanHoa_VN = sequelize.define("dataHSVVExcel_ChuanHoa_VN", {
    Error: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    MaBanGhi: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    instructingFirm:{
        type: DataTypes.STRING,
        allowNull: true,
    },
    maDoiTac: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    clientName:{
        type: DataTypes.STRING,
        allowNull: true,
    },
    nguoiXuLyChinh: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    maKhachHang: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    MatterCode: { 
        type: DataTypes.STRING,
        allowNull: true,
        field: "Matter Code", 
    },
    noiDungVuViec: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    nhomSPDV: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    tenNhanHieu: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    maQuocGiaVuViec: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    soDon: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    ngayNopDon: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    soBang: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    RegDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: "Reg Date",
    },
    ghiChu: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    ActionsAwaited: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "Actions Awaited",
    },
    Note: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    hanTraLoi: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    hanXuLy: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    Overdue: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    maHoSoVuViec: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    timestamps: true,
    tableName: "dataHSVVExcel_ChuanHoa_VN",
});
