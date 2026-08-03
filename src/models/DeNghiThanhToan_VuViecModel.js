import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { DeNghiThanhToan } from "./DeNghiThanhToanModel.js";
import { VuViec } from "./vuViecModel.js";

export const DeNghiThanhToan_VuViec = sequelize.define("DeNghiThanhToan_VuViec", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    idDeNghiThanhToan: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: DeNghiThanhToan,
            key: "id",
        },
    },
    idVuViec: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: VuViec,
            key: "id",
        },
    },
    isAutoImport: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Phân biệt dữ liệu nhập tay hoặc nhập tự động'
    }
}, {
    timestamps: true,
    tableName: "DeNghiThanhToan_VuViec",
});
