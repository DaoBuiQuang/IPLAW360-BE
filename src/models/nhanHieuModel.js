import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { addAuditHooks } from "./addAuditHooks.js";
import { fixMojibake } from "../utils/fixEncoding.js";

export const NhanHieu = sequelize.define("NhanHieu", {
  maNhanHieu: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  tenNhanHieu: {
    type: DataTypes.STRING,
    allowNull: false,
    get() {
      const rawValue = this.getDataValue("tenNhanHieu");
      return fixMojibake(rawValue);
    },
    set(val) {
      this.setDataValue("tenNhanHieu", fixMojibake(val));
    },
  },
  moTa: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  linkAnh: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
  isAutoImport: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false, 
    comment: 'Phân biệt dữ liệu nhập tay hoặc nhập tự động'
  }
}, {
  timestamps: true,
  tableName: "NhanHieu",
  hooks: {
    beforeValidate: (instance) => {
      if (instance.tenNhanHieu) {
        instance.tenNhanHieu = fixMojibake(instance.tenNhanHieu);
      }
    },
    beforeSave: (instance) => {
      if (instance.tenNhanHieu) {
        instance.tenNhanHieu = fixMojibake(instance.tenNhanHieu);
      }
    },
  },
});

addAuditHooks(NhanHieu);