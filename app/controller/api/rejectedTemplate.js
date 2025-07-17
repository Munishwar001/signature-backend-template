import { find, findOne, updateOne, save } from "../../services/templates.js";
import { signStatus, roles } from "../../constants/index.js";
import { mongoose } from "mongoose";

const handleFetchRejected = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const template = await findOne({ id: id });

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    const transformedData = template.data.filter((item) => item.signStatus === signStatus.rejected)
     .map((item) => ({
        ...item.toObject(),
        data:
          item.data instanceof Map ? Object.fromEntries(item.data) : item.data,
        rejectionReason: item.rejectionReason || "No reason provided",
        _id: item._id.toString(),
      }));

    res.status(200).json({
      ...template.toObject(),
      data: transformedData,
      templateVariables: template.templateVariables,
      allfields: template.templateVariables.map((v) => v.name),
    });
  } catch (error) {
    console.error("Fetch template error:", error);
    next(error);
  }
} 

const handleRejectTemplate = async (req, res, next) => {
  const record = req.body;
  const { id } = req.params;
  console.log("record of rejected data ");
  console.log("record =>", record);
  console.log("id =>", id);
  try {
    if (!record.requestId) {
      return res.status(400).json({ message: "Record ID is missing" });
    }
    const updatedTemplate = await updateOne(
      { id: id },
      {
        $set: {
          "data.$[elem].signStatus": signStatus.rejected,
          "data.$[elem].rejectionReason": record.rejectionReason,
        },
      },
      {
        arrayFilters: [
          { "elem.id": new mongoose.Types.ObjectId(record.requestId) },
        ],
        new: true,
      }
    );

    if (updatedTemplate.modifiedCount === 0) {
      return res
        .status(404)
        .json({ message: "Record not found in data array" });
    }

    res
      .status(200)
      .json({ success: true, message: "Record marked as deleted" });
  } catch (error) {
    console.error("Error while marking record as deleted:", error);
    next(error);
  }
};

export { handleFetchRejected, handleRejectTemplate };