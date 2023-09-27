import mongoose from "mongoose";

const schema = new mongoose.Schema({
  title: {
    type: String,
    require: [true, "Enter the course title"],
    minLength: [4, "Title must be at least 4 characters"],
    maxLength: [80, "Title must not exceed 80 characters"],
  },
  description: {
    type: String,
    require: [true, "Enter the course description"],
    minLength: [20, "Title must be at least 20 characters"],
  },
  lectures: [
    { 
      title: {
        type: String,
        require: true,
     },
     description: {
       type: String,
       require: true,
    },
    video: {
      public_id: {
          type: String,
          require: true,
      },
      url: {
          type: String,
          require: true,
      },
    },
    },
  ],

  poster: {
    public_id: {
        type: String,
        require: true,
    },
    url: {
        type: String,
        require: true,
    },
  },
  views: {
    type: Number,
    default: 0,
  },
  numOfVideos: {
    type: Number,
    default: 0,
  },
  category : {
    type: String,
    require: true,
  },
  createdBy: {
    type: String,
    require: [true, 'Enter course Creator Name'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Course = mongoose.model("Course", schema);
