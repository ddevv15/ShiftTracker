const mongoose = require('mongoose');

// Location schema
const locationSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  accuracy: {
    type: Number
  }
}, { _id: false });

// Break schema
const breakSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['LUNCH', 'SHORT'],
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  location: {
    type: locationSchema,
    required: true
  }
}, { _id: false });

// Shift schema
const shiftSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  location: {
    type: locationSchema,
    required: true
  },
  endLocation: {
    type: locationSchema
  },
  breaks: [breakSchema],
  onBreak: {
    type: Boolean,
    default: false
  },
  breakType: {
    type: String,
    enum: ['LUNCH', 'SHORT', null],
    default: null
  },
  totalWorkingTime: {
    type: Number
  },
  totalBreakTime: {
    type: Number
  }
}, {
  timestamps: true
});

// Method to calculate total working time
shiftSchema.methods.calculateWorkingTime = function() {
  if (!this.endTime) return null;
  
  // Calculate total time from start to end
  const totalTime = this.endTime - this.startTime;
  
  // Calculate break time
  let breakTime = 0;
  if (this.breaks && this.breaks.length > 0) {
    breakTime = this.breaks.reduce((total, breakItem) => {
      if (!breakItem.endTime) return total;
      return total + (breakItem.endTime - breakItem.startTime);
    }, 0);
  }
  
  // Working time = total time - break time
  return totalTime - breakTime;
};

const Shift = mongoose.model('Shift', shiftSchema);

module.exports = Shift;