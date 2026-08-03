import { Op, Sequelize } from "sequelize";
import { NhanHieu } from "../models/nhanHieuModel.js";
import { GCN_NH } from "../models/GCN_NHModel.js";

export const getShortListGCN_NH = async (req, res) => {
    try {
        let vanBangs;

        const queryOptions = {
            attributes: ["id", "soBang"], 
        };

        vanBangs = await GCN_NH.findAll(queryOptions);

        if (vanBangs.length === 0) {
            return res.status(404).json({ message: "Không có giấy chứng nhận (văn bằng) nào" });
        }

        res.status(200).json(vanBangs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getShortListGCN_NH_CAM = async (req, res) => {
    try {
        let vanBangs;

        const queryOptions = {
            attributes: ["id", "soBang"], 
        };

        vanBangs = await GCN_NH.findAll(queryOptions);

        if (vanBangs.length === 0) {
            return res.status(404).json({ message: "Không có giấy chứng nhận (văn bằng) nào" });
        }

        res.status(200).json(vanBangs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};