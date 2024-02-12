import mongoose, { model, Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscriber: {
      //the one who is subscribing the channel
      typeof: Schema.Types.ObjectId,
      ref: "User", //why not array of users ??
    },
    channel: {
      //the one to whom the "subscriber" is subscribing
      typeof: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Subscription = model("Subscription", subscriptionSchema);
