import { AuditLog } from "./auditLogModel.js";

export function addAuditHooks(model) {
  model.addHook("beforeUpdate", async (instance, options) => {
    const pkField = model.primaryKeyAttributes[0]; 
    const recordId = instance[pkField]; 

    await AuditLog.create({
      tableName: model.name,
      recordId,
      action: "UPDATE",
      oldData: instance._previousDataValues,
      newData: instance.dataValues,
      changedBy: options.userId || null,
    });
  });

  model.addHook("beforeDestroy", async (instance, options) => {
    const pkField = model.primaryKeyAttributes[0];
    const recordId = instance[pkField];

    await AuditLog.create({
      tableName: model.name,
      recordId,
      action: "DELETE",
      oldData: instance.dataValues,
      changedBy: options.userId || null,
    });
  });
}
