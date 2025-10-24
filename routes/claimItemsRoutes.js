/**
 * Claim Items Routes - API endpoints for installment claim item management
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/authJWT');
const InstallmentOrder = require('../models/Installment/InstallmentOrder');
const InstallmentPayment = require('../models/Installment/InstallmentPayment');
const Customer = require('../models/Customer/Customer');

/**
 * GET /api/claim-items/list
 * Get list of items eligible for claiming/repossession
 */
router.get('/list', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Getting claim items list...');

    const {
      page = 1,
      limit = 20,
      status = 'overdue',
      overdueDays = 90,
      branchCode,
      sortBy = 'overdueDays',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query for overdue contracts that may need item claiming
    let query = {
      deleted_at: null,
      status: { $in: ['overdue', 'defaulted'] }
    };

    if (branchCode) {
      query.branch_code = branchCode;
    }

    // Calculate overdue threshold date
    const overdueThreshold = new Date();
    overdueThreshold.setDate(overdueThreshold.getDate() - parseInt(overdueDays));

    // Get overdue contracts with aggregation pipeline
    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'customers',
          localField: 'customer',
          foreignField: '_id',
          as: 'customerDetails'
        }
      },
      {
        $lookup: {
          from: 'installmentpayments',
          localField: '_id',
          foreignField: 'contractId',
          as: 'payments'
        }
      },
      {
        $addFields: {
          customerInfo: { $arrayElemAt: ['$customerDetails', 0] },
          lastPaymentDate: { $max: '$payments.paymentDate' },
          totalPaid: { $sum: '$payments.paidAmount' },
          overdueAmount: {
            $max: [0, { $subtract: ['$totalAmount', { $sum: '$payments.paidAmount' }] }]
          },
          daysSinceLastPayment: {
            $divide: [
              {
                $subtract: [
                  new Date(),
                  { $ifNull: [{ $max: '$payments.paymentDate' }, '$createdAt'] }
                ]
              },
              86400000 // milliseconds in a day
            ]
          }
        }
      },
      {
        $match: {
          $or: [
            { daysSinceLastPayment: { $gte: parseInt(overdueDays) } },
            { overdueAmount: { $gt: 0 } }
          ]
        }
      },
      {
        $project: {
          contractNo: 1,
          contractNumber: 1,
          customerName: {
            $cond: {
              if: { $eq: ['$customerInfo.customerType', 'individual'] },
              then: {
                $concat: [
                  { $ifNull: ['$customerInfo.individual.firstName', ''] },
                  ' ',
                  { $ifNull: ['$customerInfo.individual.lastName', ''] }
                ]
              },
              else: { $ifNull: ['$customerInfo.corporate.companyName', 'บริษัท'] }
            }
          },
          customerPhone: {
            $cond: {
              if: { $eq: ['$customerInfo.customerType', 'individual'] },
              then: '$customerInfo.individual.phone',
              else: '$customerInfo.corporate.corporatePhone'
            }
          },
          customerAddress: {
            $cond: {
              if: { $eq: ['$customerInfo.customerType', 'individual'] },
              then: {
                $concat: [
                  { $ifNull: ['$customerInfo.individual.address.houseNo', ''] },
                  ' ',
                  { $ifNull: ['$customerInfo.individual.address.subDistrict', ''] },
                  ' ',
                  { $ifNull: ['$customerInfo.individual.address.district', ''] },
                  ' ',
                  { $ifNull: ['$customerInfo.individual.address.province', ''] }
                ]
              },
              else: {
                $concat: [
                  { $ifNull: ['$customerInfo.corporate.address.houseNo', ''] },
                  ' ',
                  { $ifNull: ['$customerInfo.corporate.address.subDistrict', ''] },
                  ' ',
                  { $ifNull: ['$customerInfo.corporate.address.district', ''] },
                  ' ',
                  { $ifNull: ['$customerInfo.corporate.address.province', ''] }
                ]
              }
            }
          },
          items: 1,
          totalAmount: 1,
          totalPaid: 1,
          overdueAmount: 1,
          monthlyPayment: 1,
          installmentCount: 1,
          currentInstallment: 1,
          lastPaymentDate: 1,
          daysSinceLastPayment: { $round: ['$daysSinceLastPayment', 0] },
          status: 1,
          branch_code: 1,
          createdAt: 1,
          claimStatus: {
            $cond: {
              if: { $gte: ['$daysSinceLastPayment', 180] },
              then: 'ready_for_legal',
              else: {
                $cond: {
                  if: { $gte: ['$daysSinceLastPayment', 120] },
                  then: 'ready_for_claim',
                  else: 'monitoring'
                }
              }
            }
          },
          riskLevel: {
            $cond: {
              if: { $gte: ['$daysSinceLastPayment', 180] },
              then: 'สูงมาก',
              else: {
                $cond: {
                  if: { $gte: ['$daysSinceLastPayment', 120] },
                  then: 'สูง',
                  else: {
                    $cond: {
                      if: { $gte: ['$daysSinceLastPayment', 90] },
                      then: 'ปานกลาง',
                      else: 'ต่ำ'
                    }
                  }
                }
              }
            }
          }
        }
      }
    ];

    // Add sorting
    const sortField = {};
    sortField[sortBy] = sortOrder === 'desc' ? -1 : 1;
    pipeline.push({ $sort: sortField });

    // Execute aggregation with pagination
    const [claimItems, totalCount] = await Promise.all([
      InstallmentOrder.aggregate([
        ...pipeline,
        { $skip: skip },
        { $limit: parseInt(limit) }
      ]),
      InstallmentOrder.aggregate([
        ...pipeline,
        { $count: 'total' }
      ])
    ]);

    const total = totalCount[0]?.total || 0;

    // Format the results
    const formattedItems = claimItems.map(item => ({
      id: item._id,
      contractNo: item.contractNo,
      contractNumber: item.contractNumber,
      customerName: item.customerName?.trim() || 'ไม่ระบุ',
      customerPhone: item.customerPhone || 'ไม่ระบุ',
      customerAddress: item.customerAddress?.trim() || 'ไม่ระบุ',
      items: item.items || [],
      itemDescription: item.items?.[0]?.name || 'ไม่ระบุ',
      totalAmount: Math.max(0, item.totalAmount || 0),
      totalPaid: Math.max(0, item.totalPaid || 0),
      overdueAmount: Math.max(0, item.overdueAmount || 0),
      monthlyPayment: Math.max(0, item.monthlyPayment || 0),
      installmentCount: item.installmentCount || 0,
      currentInstallment: item.currentInstallment || 0,
      lastPaymentDate: item.lastPaymentDate,
      daysSinceLastPayment: Math.max(0, item.daysSinceLastPayment || 0),
      status: item.status,
      claimStatus: item.claimStatus,
      riskLevel: item.riskLevel,
      branchCode: item.branch_code,
      progressPercentage: item.totalAmount > 0
        ? Math.round(((item.totalPaid || 0) / item.totalAmount) * 100)
        : 0,
      daysOverdue: Math.max(0, item.daysSinceLastPayment || 0),
      createdAt: item.createdAt
    }));

    // Calculate summary statistics
    const summary = {
      totalItems: total,
      readyForClaim: formattedItems.filter(item => item.claimStatus === 'ready_for_claim').length,
      readyForLegal: formattedItems.filter(item => item.claimStatus === 'ready_for_legal').length,
      monitoring: formattedItems.filter(item => item.claimStatus === 'monitoring').length,
      totalOverdueAmount: formattedItems.reduce((sum, item) => sum + item.overdueAmount, 0),
      averageOverdueAmount: formattedItems.length > 0
        ? Math.round(formattedItems.reduce((sum, item) => sum + item.overdueAmount, 0) / formattedItems.length)
        : 0,
      riskDistribution: {
        สูงมาก: formattedItems.filter(item => item.riskLevel === 'สูงมาก').length,
        สูง: formattedItems.filter(item => item.riskLevel === 'สูง').length,
        ปานกลาง: formattedItems.filter(item => item.riskLevel === 'ปานกลาง').length,
        ต่ำ: formattedItems.filter(item => item.riskLevel === 'ต่ำ').length
      }
    };

    res.json({
      success: true,
      data: formattedItems,
      summary,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      filters: {
        overdueDays: parseInt(overdueDays),
        branchCode,
        status,
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    console.error('❌ Error fetching claim items:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงรายการสินค้าที่ต้องติดตาม',
      error: error.message
    });
  }
});

/**
 * POST /api/claim-items/:id/action
 * Take action on a claim item (start claim process, legal action, etc.)
 */
router.post('/:id/action', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes, scheduledDate } = req.body;

    console.log(`🔄 Taking action ${action} on claim item ${id}`);

    const contract = await InstallmentOrder.findById(id);
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบสัญญาที่ระบุ'
      });
    }

    // Update contract based on action
    let updateFields = {
      updatedAt: new Date(),
      updatedBy: req.user?.id
    };

    switch (action) {
      case 'start_claim':
        updateFields.claimStatus = 'in_process';
        updateFields.claimStartDate = new Date();
        updateFields.status = 'in_claim_process';
        break;

      case 'legal_action':
        updateFields.claimStatus = 'legal_action';
        updateFields.legalActionDate = new Date();
        updateFields.status = 'legal_process';
        break;

      case 'repossession':
        updateFields.claimStatus = 'repossessed';
        updateFields.repossessionDate = new Date();
        updateFields.status = 'repossessed';
        break;

      case 'settlement':
        updateFields.claimStatus = 'settled';
        updateFields.settlementDate = new Date();
        updateFields.status = 'settled';
        break;

      case 'reschedule':
        updateFields.claimStatus = 'rescheduled';
        updateFields.rescheduleDate = scheduledDate ? new Date(scheduledDate) : new Date();
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'การดำเนินการที่ระบุไม่ถูกต้อง'
        });
    }

    // Add notes if provided
    if (notes) {
      updateFields.$push = {
        claimNotes: {
          action,
          notes,
          date: new Date(),
          userId: req.user?.id
        }
      };
    }

    await InstallmentOrder.findByIdAndUpdate(id, updateFields);

    console.log(`✅ Action ${action} completed for contract ${contract.contractNo}`);

    res.json({
      success: true,
      message: `ดำเนินการ ${action} เรียบร้อยแล้ว`,
      data: {
        contractId: id,
        contractNo: contract.contractNo,
        action,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Error taking claim action:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดำเนินการ',
      error: error.message
    });
  }
});

/**
 * GET /api/claim-items/:id/history
 * Get claim action history for an item
 */
router.get('/:id/history', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const contract = await InstallmentOrder.findById(id)
      .populate('customer')
      .lean();

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบสัญญาที่ระบุ'
      });
    }

    // Get payment history
    const payments = await InstallmentPayment.find({ contractId: id })
      .sort({ paymentDate: -1 })
      .lean();

    const history = {
      contract: {
        contractNo: contract.contractNo,
        customerName: contract.customer ?
          (contract.customer.customerType === 'individual'
            ? `${contract.customer.individual?.firstName || ''} ${contract.customer.individual?.lastName || ''}`.trim()
            : contract.customer.corporate?.companyName || 'บริษัท')
          : 'ไม่ระบุ',
        totalAmount: contract.totalAmount,
        currentStatus: contract.status
      },
      claimActions: contract.claimNotes || [],
      paymentHistory: payments.map(payment => ({
        date: payment.paymentDate,
        amount: payment.paidAmount,
        method: payment.paymentMethod,
        status: payment.status,
        installmentNumber: payment.installmentNumber
      })),
      timeline: [
        {
          date: contract.createdAt,
          event: 'สร้างสัญญา',
          description: `สัญญา ${contract.contractNo} ถูกสร้าง`
        },
        ...(contract.claimNotes || []).map(note => ({
          date: note.date,
          event: note.action,
          description: note.notes,
          userId: note.userId
        })),
        ...payments.map(payment => ({
          date: payment.paymentDate,
          event: 'ชำระเงิน',
          description: `ชำระงวดที่ ${payment.installmentNumber} จำนวน ${payment.paidAmount} บาท`
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date))
    };

    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('❌ Error fetching claim history:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงประวัติการติดตาม',
      error: error.message
    });
  }
});

module.exports = router;