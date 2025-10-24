/**
 * scripts/injectSocketIO.js
 */
export const parser = 'babel';

export default function transformer(file, api) {
  const j = api.jscodeshift;
  let root;
  try {
    root = j(file.source);
  } catch {
    return null; // ข้ามไฟล์ parse ไม่ผ่าน
  }

  const fname = file.path.split(/[/\\]/).pop();
  if (['auditLogController.js', 'accountingController.js'].includes(fname)) {
    return null;
  }

  const CRUD = {
    save:              'Created',
    create:            'Created',
    findByIdAndUpdate: 'Updated',
    findOneAndUpdate:  'Updated',
    updateOne:         'Updated',
    updateMany:        'Updated',
    findByIdAndDelete: 'Deleted',
    findOneAndDelete:  'Deleted',
    deleteOne:         'Deleted',
    deleteMany:        'Deleted'
  };

  function processFn(fnBody) {
    if (!fnBody || fnBody.type !== 'BlockStatement') return;

    // inject io if missing
    if (j(fnBody).find(j.Identifier, { name: 'io' }).size() === 0) {
      fnBody.body.unshift(
        j.variableDeclaration('const', [
          j.variableDeclarator(
            j.identifier('io'),
            j.callExpression(
              j.memberExpression(
                j.memberExpression(j.identifier('req'), j.identifier('app')),
                j.identifier('get')
              ),
              [j.literal('io')]
            )
          )
        ])
      );
    }

    j(fnBody)
      .find(j.CallExpression)
      .forEach(pathCall => {
        const prop = pathCall.node.callee.property;
        const name = pathCall.node.callee.name;
        const method = prop && CRUD[prop.name] ? prop.name
                     : name && CRUD[name]        ? name
                     : null;
        if (!method) return;

        // compute event name
        let resName = 'resource';
        if (prop && pathCall.node.callee.object && pathCall.node.callee.object.name) {
          resName = pathCall.node.callee.object.name.toLowerCase();
        } else if (name) {
          resName = name.replace(/(?:create|post|update|delete)/i, '').toLowerCase() || 'resource';
        }
        const event = resName + CRUD[method];

        // เตรียม statement for emit
        let idExpr, dataExpr;
        // ถ้าเป็น `const foo = Model.create(...)`
        j(pathCall)
          .closest(j.VariableDeclaration)
          .forEach(varPath => {
            const varName = varPath.node.declarations[0].id.name;
            idExpr   = j.memberExpression(j.identifier(varName), j.identifier('_id'));
            dataExpr = j.identifier(varName);
          });
        // ถ้ายังไม่ถูกจับ ก็ใช้ callExpr._id
        if (!idExpr) {
          idExpr   = j.memberExpression(pathCall.node, j.identifier('_id'));
          dataExpr = pathCall.node;
        }

        const emitStmt = j.expressionStatement(
          j.callExpression(
            j.memberExpression(j.identifier('io'), j.identifier('emit')),
            [
              j.literal(event),
              j.objectExpression([
                j.property('init', j.identifier('id'), idExpr),
                j.property('init', j.identifier('data'), dataExpr)
              ])
            ]
          )
        );

        // หา statement parent ด้วยการไล่ parentPath เอง
        let stmtPath = pathCall;
        // หยุดเมื่อเจอ ExpressionStatement, ReturnStatement หรือ VariableDeclaration
        while (
          stmtPath &&
          !(
            stmtPath.node.type.endsWith('Statement') ||
            stmtPath.node.type === 'VariableDeclaration'
          )
        ) {
          stmtPath = stmtPath.parentPath;
        }
        if (!stmtPath || typeof stmtPath.insertAfter !== 'function') return;

        // เอาไปแทรกหลัง closest Statement
        const stmtColl = j(pathCall).closest(j.Statement);
        if (stmtColl.size()) {
          stmtColl.insertAfter(emitStmt);
        }
      });
  }

  // CommonJS: exports.foo = async fn
  root.find(j.AssignmentExpression, {
    left: { object: { name: 'exports' } }
  }).forEach(p => {
    const fn = p.node.right;
    if ((fn.type === 'FunctionExpression' || fn.type === 'ArrowFunctionExpression') && fn.async) {
      processFn(fn.body);
    }
  });

  // CommonJS: module.exports.foo = async fn
  root.find(j.AssignmentExpression, {
    left: {
      object: { object: { name: 'module' }, property: { name: 'exports' } }
    }
  }).forEach(p => {
    const fn = p.node.right;
    if ((fn.type === 'FunctionExpression' || fn.type === 'ArrowFunctionExpression') && fn.async) {
      processFn(fn.body);
    }
  });

  // ESM: export async function foo...
  root.find(j.ExportNamedDeclaration).forEach(p => {
    const decl = p.node.declaration;
    if (decl && decl.type === 'FunctionDeclaration' && decl.async) {
      processFn(decl.body);
    }
  });

  // ESM: export const foo = async () => { ... }
  root.find(j.ExportNamedDeclaration, {
    declaration: { type: 'VariableDeclaration' }
  }).forEach(p => {
    const vd = p.node.declaration.declarations[0];
    const fn = vd.init;
    if (fn && fn.type === 'ArrowFunctionExpression' && fn.async) {
      processFn(fn.body);
    }
  });

  return root.toSource({ quote: 'single' });
}
