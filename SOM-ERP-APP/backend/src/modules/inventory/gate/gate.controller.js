// All gate logic has been split into sub-folders:
//   create/gate.controller.js  — createGateInward, createGateOutward
//   get/gate.controller.js     — listGateInward, getGateInward, listGateOutward, getGateOutward
//   update/gate.controller.js  — updateGateInwardStatus, updateGateOutwardStatus
//   delete/gate.controller.js  — deleteGateInward, deleteGateOutward
//
// Routes are wired via gate/router.js, mounted at /erp/gate in inventory/routes.js
