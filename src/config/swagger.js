import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DATN Backend API Documentation',
      version: '1.0.0',
      description: 'API documentation cho hệ thống quản lý đơn đăng ký nhãn hiệu',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Nhập JWT token để xác thực'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Thông báo lỗi'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['Username', 'Password'],
          properties: {
            Username: {
              type: 'string',
              example: 'admin'
            },
            Password: {
              type: 'string',
              example: 'password123'
            }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Đăng nhập thành công'
            },
            token: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            },
            role: {
              type: 'string',
              example: 'admin'
            },
            user: {
              type: 'object',
              properties: {
                maNhanSu: {
                  type: 'string',
                  example: 'NS001'
                },
                hoTen: {
                  type: 'string',
                  example: 'Nguyễn Văn A'
                },
                email: {
                  type: 'string',
                  example: 'admin@example.com'
                }
              }
            }
          }
        },
        Application: {
          type: 'object',
          properties: {
            maDonDangKy: {
              type: 'string',
              example: 'HSVV001_abc123'
            },
            soDon: {
              type: 'string',
              example: '4-2024-123456'
            },
            maHoSoVuViec: {
              type: 'string',
              example: 'HSVV001'
            },
            tenNhanHieu: {
              type: 'string',
              example: 'Coca Cola'
            },
            trangThaiDon: {
              type: 'string',
              example: 'Nộp đơn'
            },
            trangThaiVuViec: {
              type: 'string',
              example: '1'
            },
            ngayNopDon: {
              type: 'string',
              format: 'date',
              example: '2024-01-15'
            },
            loaiDon: {
              type: 'integer',
              example: 1,
              description: '1=Đơn gốc, 2=Đơn sửa đổi, 3=Đơn tách, 4=Đơn chuyển nhượng'
            }
          }
        },
        ApplicationListRequest: {
          type: 'object',
          properties: {
            searchText: {
              type: 'string',
              description: 'Tìm kiếm theo số đơn hoặc mã hồ sơ'
            },
            customerName: {
              type: 'string',
              description: 'Tên khách hàng'
            },
            partnerName: {
              type: 'string',
              description: 'Tên đối tác'
            },
            brandName: {
              type: 'string',
              description: 'Tên nhãn hiệu'
            },
            maNguoiXuLy1: {
              type: 'string',
              description: 'Mã người xử lý'
            },
            maSPDVList: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Danh sách mã sản phẩm dịch vụ'
            },
            trangThaiDon: {
              type: 'string',
              description: 'Trạng thái đơn'
            },
            trangThaiVuViec: {
              type: 'string',
              description: 'Trạng thái vụ việc (1-6)'
            },
            trangThaiTaiLieu: {
              type: 'integer',
              description: '1=Chưa hoàn thành, 2=Đã hoàn thành'
            },
            loaiDon: {
              type: 'integer',
              description: '1=Đơn gốc, 2=Đơn sửa đổi, 3=Đơn tách, 4=Đơn chuyển nhượng'
            },
            fields: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Danh sách các field cần lấy'
            },
            filterCondition: {
              type: 'object',
              properties: {
                selectedField: {
                  type: 'string',
                  description: 'Trường ngày để lọc'
                },
                fromDate: {
                  type: 'string',
                  format: 'date'
                },
                toDate: {
                  type: 'string',
                  format: 'date'
                },
                hanXuLyFilter: {
                  type: 'string',
                  enum: ['<7', '<15', '<30', 'overdue']
                },
                hanTraLoiFilter: {
                  type: 'string',
                  enum: ['<7', '<15', '<30', 'overdue']
                },
                sortByHanXuLy: {
                  type: 'boolean'
                },
                sortByHanTraLoi: {
                  type: 'boolean'
                },
                sortByUpdatedAt: {
                  type: 'boolean'
                },
                sortByCreatedAt: {
                  type: 'boolean'
                }
              }
            },
            pageIndex: {
              type: 'integer',
              default: 1
            },
            pageSize: {
              type: 'integer',
              default: 20
            }
          }
        },
        ExportExcelRequest: {
          type: 'object',
          properties: {
            searchText: {
              type: 'string'
            },
            customerName: {
              type: 'string'
            },
            partnerName: {
              type: 'string'
            },
            brandName: {
              type: 'string'
            },
            maNguoiXuLy1: {
              type: 'string'
            },
            maSPDVList: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            trangThaiDon: {
              type: 'string'
            },
            trangThaiVuViec: {
              type: 'string'
            },
            trangThaiTaiLieu: {
              type: 'integer'
            },
            loaiDon: {
              type: 'integer'
            },
            fields: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Các cột cần xuất'
            },
            filterCondition: {
              type: 'object'
            },
            reportTitle: {
              type: 'string',
              default: 'BÁO CÁO DANH SÁCH ĐƠN ĐĂNG KÝ NHÃN HIỆU VIỆT NAM'
            },
            reportFileName: {
              type: 'string',
              example: 'bao_cao_don_VN_20240115'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routers/*.js', './src/controllers/*.js']
};

const swaggerSpec = swaggerJsdoc(options);
export { swaggerUi, swaggerSpec };
