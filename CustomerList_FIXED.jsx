import { useNavigate, useNavigationType } from "react-router-dom";
import React, { useState, useEffect } from "react";
import callAPI from "../../utils/api";
import { useSelector } from "react-redux";
import Select from "react-select";
import { exportToExcel } from "../../components/ExportFile/ExportExcel";
import FieldSelector from "../../components/FieldSelector";
import { Modal, Spin, Pagination } from "antd";
import { useTranslation } from "react-i18next";

const FILTER_STORAGE_KEY_CUSTOMER = "customerListFilters";
const STATE_STORAGE_KEY_CUSTOMER = "customerListState";
const PAGE_STORAGE_KEY_CUSTOMER = "customerListPage";

function CustomerList() {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const role = useSelector((state) => state.auth.role);

  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState("");

  const [partners, setPartners] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState("");

  const [industries, setIndustries] = useState([]);
  const [selectedIndustry, setSelectedIndustry] = useState("");

  // ✅ THÊM MỚI: State cho người phụ trách
  const [staffs, setStaffs] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState("");

  const [showFieldModal, setShowFieldModal] = useState(false);
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const navigate = useNavigate();
  const navigationType = useNavigationType();

  const [selectedFields, setSelectedFields] = useState([
    "maKhachHang",
    "tenKhachHang",
    "diaChi",
    "sdt",
    "nguoiLienHe",
    "tenDoiTac",
    "tenQuocGia",
    "ghiChu",
    "tenNganhNghe",
    "tenNhom",
    "tenNhanSu",
  ]);

  const allFieldOptions = [
    { key: "maKhachHang", label: t("maKhachHang"), labelEn: "Client Code" },
    { key: "tenKhachHang", label: t("tenKhachHang"), labelEn: "Client Name" },
    { key: "diaChi", label: t("diaChi"), labelEn: "Address" },
    { key: "sdt", label: t("sdt"), labelEn: "Phone Number" },
    { key: "nguoiLienHe", label: t("nguoiLienHe"), labelEn: "Contact Person" },
    { key: "tenDoiTac", label: t("tenDoiTac"), labelEn: "Instructing firm" },
    { key: "tenQuocGia", label: t("tenQuocGia"), labelEn: "Country" },
    { key: "tenNganhNghe", label: t("tenNganhNghe"), labelEn: "Industry" },
    {key: "tenNhom", label: t("Nhóm"), labelEn: "Group by" },
    { key: "ghiChu", label: t("ghiChu"), labelEn: "Note" },
    { key: "tenNhanSu", label: "Người phụ trách", labelEn: "Staff in charge" },
  ];

  const columns = allFieldOptions
    .filter((field) => selectedFields.includes(field.key))
    .map((field) => ({
      label: field.label,
      labelEn: field.labelEn,
      key: field.key,
    }));

  const formatOptions = (data, valueKey, labelKey) =>
    data.map((item) => ({ value: item[valueKey], label: item[labelKey] }));

  const fetchCustomers = async (
    searchValue,
    partnerId,
    countryId,
    industryId,
    staffId,
    page = 1,
    size = 10
  ) => {
    setLoading(true);
    try {
      localStorage.setItem(PAGE_STORAGE_KEY_CUSTOMER, page.toString());

      const response = await callAPI({
        method: "post",
        endpoint: "/customer/list",
        data: {
          tenKhachHang: searchValue,
          maDoiTac: partnerId,
          maQuocGia: countryId,
          maNganhNghe: industryId,
          maNhanSu: staffId,
          fields: selectedFields,
          pageIndex: page,
          pageSize: size,
        },
      });

      setCustomers(response.data || []);
      setTotalItems(response.pagination?.totalItems || 0);
      setPageIndex(response.pagination?.pageIndex || 1);
      setPageSize(response.pagination?.pageSize || 10);
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu khách hàng:", error);
      setCustomers([]);
      setTotalItems(0);
      setPageIndex(1);
      setPageSize(10);
    } finally {
      setLoading(false);
    }
  };

  const fetchCountries = async () => {
    const res = await callAPI({
      method: "post",
      endpoint: "/country/list",
      data: {},
    });
    setCountries(res);
  };

  const fetchPartners = async () => {
    const res = await callAPI({
      method: "post",
      endpoint: "/partner/all",
      data: {},
    });
    setPartners(res);
  };

  const fetchIndustries = async () => {
    const res = await callAPI({
      method: "post",
      endpoint: "/industry/list",
      data: {},
    });
    setIndustries(res);
  };

  // ✅ THÊM MỚI: Fetch danh sách nhân sự
  const fetchStaffs = async () => {
    try {
      const res = await callAPI({
        method: "post",
        endpoint: "/staff/basiclist",
        data: {},
      });
      setStaffs(res);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách nhân sự:", error);
    }
  };

  useEffect(() => {
    const savedPage = parseInt(
      localStorage.getItem(PAGE_STORAGE_KEY_CUSTOMER) || "1",
      10
    );
    const savedFiltersString = localStorage.getItem(
      FILTER_STORAGE_KEY_CUSTOMER
    );
    const savedStateString = localStorage.getItem(STATE_STORAGE_KEY_CUSTOMER);

    fetchCountries();
    fetchPartners();
    fetchIndustries();
    fetchStaffs(); // ✅ THÊM MỚI

    if (navigationType === "POP" && savedStateString) {
      try {
        const savedFilters = savedFiltersString
          ? JSON.parse(savedFiltersString)
          : {};
        const savedState = JSON.parse(savedStateString);

        setSearchTerm(savedFilters.searchTerm || "");
        setSelectedCountry(savedFilters.selectedCountry || "");
        setSelectedPartner(savedFilters.selectedPartner || "");
        setSelectedIndustry(savedFilters.selectedIndustry || "");
        setSelectedStaff(savedFilters.selectedStaff || ""); // ✅ THÊM MỚI

        setCustomers(savedState.customers || []);
        setTotalItems(savedState.totalItems || 0);
        setPageIndex(savedState.pageIndex || savedPage || 1);
        setPageSize(savedState.pageSize || 10);
      } catch (e) {
        console.error("Error parsing saved state/filters (CUSTOMER)", e);
        fetchCustomers("", null, null, null, null, savedPage, pageSize);
      }
    } else {
      if (savedFiltersString) {
        try {
          const savedFilters = JSON.parse(savedFiltersString);

          setSearchTerm(savedFilters.searchTerm || "");
          setSelectedCountry(savedFilters.selectedCountry || "");
          setSelectedPartner(savedFilters.selectedPartner || "");
          setSelectedIndustry(savedFilters.selectedIndustry || "");
          setSelectedStaff(savedFilters.selectedStaff || ""); // ✅ THÊM MỚI

          fetchCustomers(
            savedFilters.searchTerm || "",
            savedFilters.selectedPartner || null,
            savedFilters.selectedCountry || null,
            savedFilters.selectedIndustry || null,
            savedFilters.selectedStaff || null, // ✅ THÊM MỚI
            savedPage,
            pageSize
          );
        } catch (e) {
          console.error("Error parsing saved filters (CUSTOMER)", e);
          fetchCustomers("", null, null, null, null, savedPage, pageSize);
        }
      } else {
        fetchCustomers("", null, null, null, null, savedPage, pageSize);
      }
    }

    if (!localStorage.getItem(PAGE_STORAGE_KEY_CUSTOMER)) {
      localStorage.setItem(PAGE_STORAGE_KEY_CUSTOMER, "1");
    }
  }, [navigationType]);

  useEffect(() => {
    const filtersToSave = {
      searchTerm,
      selectedCountry,
      selectedPartner,
      selectedIndustry,
      selectedStaff, // ✅ THÊM MỚI
    };
    localStorage.setItem(
      FILTER_STORAGE_KEY_CUSTOMER,
      JSON.stringify(filtersToSave)
    );
  }, [searchTerm, selectedCountry, selectedPartner, selectedIndustry, selectedStaff]);

  useEffect(() => {
    const stateToSave = {
      customers,
      totalItems,
      pageIndex,
      pageSize,
    };
    localStorage.setItem(
      STATE_STORAGE_KEY_CUSTOMER,
      JSON.stringify(stateToSave)
    );
  }, [customers, totalItems, pageIndex, pageSize]);

  const handleDeleteCustomer = async () => {
    try {
      await callAPI({
        method: "post",
        endpoint: "/customer/delete",
        data: { id: customerToDelete },
      });
      setShowDeleteModal(false);
      setCustomerToDelete(null);
      fetchCustomers(
        searchTerm,
        selectedPartner,
        selectedCountry,
        selectedIndustry,
        selectedStaff, // ✅ THÊM MỚI
        pageIndex,
        pageSize
      );
    } catch (err) {
      console.error("Lỗi khi xóa khách hàng:", err);
    }
  };

  return (
    <div className="p-1 bg-gray-100 min-h-screen">
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          {t("danhSachKhachHang")}
        </h2>

        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                fetchCustomers(
                  searchTerm,
                  selectedPartner,
                  selectedCountry,
                  selectedIndustry,
                  selectedStaff,
                  1,
                  pageSize
                );
              }
            }}
            placeholder="🔍 Nhập tên khách hàng"
            className="p-3 border border-gray-300 rounded-lg w-full md:w-1/3 focus:outline-none focus:ring-2 search-input"
          />

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() =>
                fetchCustomers(
                  searchTerm,
                  selectedPartner,
                  selectedCountry,
                  selectedIndustry,
                  selectedStaff,
                  1,
                  pageSize
                )
              }
              className="bg-[#009999] hover:bg-[#007a7a] text-white px-5 py-3 rounded-lg shadow-md transition"
            >
              {t("timKiem")}
            </button>
            <button
              onClick={() => navigate("/customeradd")}
              className="bg-[#009999] hover:bg-[#007a7a] text-white px-5 py-3 rounded-lg shadow-md transition"
            >
              {t("themMoi")}
            </button>
            <button
              onClick={() => exportToExcel(customers, columns, "DanhSachKhachHang")}
              className="bg-[#009999] hover:bg-[#007a7a] text-white px-5 py-3 rounded-lg shadow-md transition"
            >
              {t("xuatExcel")}
            </button>
            <button
              onClick={() => setShowFieldModal(true)}
              className="bg-[#009999] hover:bg-[#007a7a] text-white px-5 py-3 rounded-lg shadow-md transition"
            >
              {t("chonCotHienThi")}
            </button>
          </div>
        </div>

        {/* ✅ THÊM dropdown Người phụ trách */}
        <div className="flex flex-wrap gap-3">
          <div className="w-full md:w-1/6">
            <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
              {t("chonQuocGia")}
            </label>
            <Select
              options={formatOptions(countries, "maQuocGia", "tenQuocGia")}
              value={
                selectedCountry
                  ? formatOptions(countries, "maQuocGia", "tenQuocGia").find(
                      (opt) => opt.value === selectedCountry
                    )
                  : null
              }
              onChange={(opt) => setSelectedCountry(opt?.value || "")}
              placeholder={t("chonQuocGia")}
              isClearable
              className="text-left"
            />
          </div>
          <div className="w-full md:w-1/6">
            <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
              {t("chonDoiTac")}
            </label>
            <Select
              options={formatOptions(partners, "maDoiTac", "tenDoiTac")}
              value={
                selectedPartner
                  ? formatOptions(partners, "maDoiTac", "tenDoiTac").find(
                      (opt) => opt.value === selectedPartner
                    )
                  : null
              }
              onChange={(opt) => setSelectedPartner(opt?.value || "")}
              placeholder={t("chonDoiTac")}
              isClearable
              className="text-left"
            />
          </div>
          <div className="w-full md:w-1/6">
            <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
              {t("chonNganhNghe")}
            </label>
            <Select
              options={formatOptions(industries, "maNganhNghe", "tenNganhNghe")}
              value={
                selectedIndustry
                  ? formatOptions(
                      industries,
                      "maNganhNghe",
                      "tenNganhNghe"
                    ).find((opt) => opt.value === selectedIndustry)
                  : null
              }
              onChange={(opt) => setSelectedIndustry(opt?.value || "")}
              placeholder={t("chonNganhNghe")}
              isClearable
              className="text-left"
            />
          </div>

          {/* ✅ THÊM MỚI: Dropdown Người phụ trách */}
          <div className="w-full md:w-1/6">
            <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
              Người phụ trách
            </label>
            <Select
              options={formatOptions(staffs, "maNhanSu", "hoTen")}
              value={
                selectedStaff
                  ? formatOptions(staffs, "maNhanSu", "hoTen").find(
                      (opt) => opt.value === selectedStaff
                    )
                  : null
              }
              onChange={(opt) => setSelectedStaff(opt?.value || "")}
              placeholder="Chọn người phụ trách"
              isClearable
              className="text-left"
            />
          </div>
        </div>
      </div>

      <div className="mb-2 text-left text-gray-600 text-xl">
        {t("Tìm thấy")} <b className="text-blue-600">{totalItems}</b>{" "}
        {t("kết quả")}
      </div>

      <div className="overflow-x-auto mt-4 overflow-hidden rounded-lg border shadow">
        <Spin spinning={loading} tip="Loading..." size="large">
          <table className="w-full border-collapse bg-white text-sm">
            <thead>
              <tr className="text-[#667085] text-center font-normal">
                <th className="p-2 text-table">
                  <div className="leading-tight">
                    {t("stt")}
                    <div className="text-xs text-gray-700">No.</div>
                  </div>
                </th>
                {columns.map((col) => (
                  <th key={col.key} className="p-2 text-table">
                    <div className="leading-tight">
                      {col.label}
                      <div className="text-xs text-gray-700">{col.labelEn}</div>
                    </div>
                  </th>
                ))}
                <th className="p-2 text-table"></th>
              </tr>
            </thead>

            <tbody>
              {customers.length > 0 ? (
                customers.map((cus, idx) => (
                  <tr
                    key={cus.maKhachHang}
                    className="group hover:bg-gray-100 text-center border-b relative"
                  >
                    <td className="p-2 text-table">
                      {(pageIndex - 1) * pageSize + idx + 1}
                    </td>
                    {columns.map((col) => {
                      const content = cus[col.key];

                      if (col.key === "maKhachHang") {
                        return (
                          <td
                            key={col.key}
                            className="p-2 text-table text-blue-500 cursor-pointer hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/customerdetail/${cus.id}`);
                            }}
                          >
                            {content}
                          </td>
                        );
                      }

                      return (
                        <td key={col.key} className="p-2 text-table">
                          {content}
                        </td>
                      );
                    })}
                    <td className="p-2 relative">
                      {(role === "admin" || role === "staff") && (
                        <div className="hidden group-hover:flex gap-2 absolute right-2 top-1/2 -translate-y-1/2 bg-white p-1 rounded shadow-md z-10">
                          <button
                            className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300"
                            onClick={() => navigate(`/customeredit/${cus.id}`)}
                          >
                            📝
                          </button>
                          <button
                            className="px-3 py-1 bg-red-200 text-red-600 rounded-md hover:bg-red-300"
                            onClick={() => {
                              setCustomerToDelete(cus.id);
                              setShowDeleteModal(true);
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length + 2}
                    className="text-center py-6 text-gray-500 italic"
                  >
                    Không có bản ghi nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Spin>
      </div>

      <div className="mt-4 flex flex-col items-center space-y-2">
        {totalItems > 0 && (
          <div className="text-sm text-gray-500 text-center ">
            <span className="font-medium text-gray-800">
              {(pageIndex - 1) * pageSize + 1} -{" "}
              {Math.min(pageIndex * pageSize, totalItems)}
            </span>
            <span className="mx-1"> / </span>
            <span className="font-medium text-gray-800">{totalItems}</span>
          </div>
        )}
        <Pagination
          current={pageIndex}
          total={totalItems}
          pageSize={pageSize}
          onChange={(page, size) => {
            setPageIndex(page);
            setPageSize(size);
            fetchCustomers(
              searchTerm,
              selectedPartner,
              selectedCountry,
              selectedIndustry,
              selectedStaff,
              page,
              size
            );
          }}
          showSizeChanger
          pageSizeOptions={["5", "10", "20", "50"]}
          locale={{ items_per_page: t("bản ghi") }}
        />
      </div>

      <FieldSelector
        visible={showFieldModal}
        allFieldOptions={allFieldOptions}
        selectedFields={selectedFields}
        setSelectedFields={setSelectedFields}
        onClose={() => setShowFieldModal(false)}
        onConfirm={() => setShowFieldModal(false)}
      />

      <Modal
        title={t("xacNhanXoa")}
        open={showDeleteModal}
        onOk={handleDeleteCustomer}
        onCancel={() => setShowDeleteModal(false)}
        okText={t("xacNhan")}
        cancelText={t("huy")}
        okButtonProps={{
          className: "bg-red-500 hover:bg-red-600 text-white",
        }}
      >
        <p>{t("cauHoiXacNhanXoa")}</p>
      </Modal>
    </div>
  );
}

export default CustomerList;
