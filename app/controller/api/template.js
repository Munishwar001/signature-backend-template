import { find, findOne, updateOne, save } from "../../services/templates.js";
import { signStatus, roles } from "../../constants/index.js";
import { mongoose } from "mongoose";
import Template from "../../models/template.js";

const handleDelete = async (req, res, next) => {
  const record = req.body;
  const { id } = req.params;
  console.log("record =>", record);
  console.log("id =>", id);
  try {
    if (!record.id) {
      return res.status(400).json({ message: "Record ID is missing" });
    }
    const updatedTemplate = await updateOne(
      {
        id: id,
        $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }],
      },
      {
        $set: {
          "data.$[elem].isDeleted": true,
        },
      },
      {
        arrayFilters: [{ "elem.id": new mongoose.Types.ObjectId(record.id) }],
        new: true,
      }
    );

    if (updatedTemplate.modifiedCount === 0) {
      return res.status(404).json({ message: "Record not found in data array" });}

    res.status(200).json({ success: true, message: "Record marked as deleted" });
  } catch (error) {
    console.error("Error while marking record as deleted:", error);
    next(error);
  }
}

export { handleDelete};
