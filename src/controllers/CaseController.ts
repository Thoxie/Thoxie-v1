import { Request, Response } from 'express';
import { Case } from '../models/Case';

// Create a new case
export const createCase = async (req: Request, res: Response) => {
    try {
        const newCase = new Case(req.body);
        await newCase.save();
        return res.status(201).json(newCase);
    } catch (error) {
        return res.status(500).json({ message: 'Error creating case', error });
    }
};

// Read all cases
export const getCases = async (req: Request, res: Response) => {
    try {
        const cases = await Case.find();
        return res.status(200).json(cases);
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching cases', error });
    }
};

// Update a case by ID
export const updateCase = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updatedCase = await Case.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedCase) {
            return res.status(404).json({ message: 'Case not found' });
        }
        return res.status(200).json(updatedCase);
    } catch (error) {
        return res.status(500).json({ message: 'Error updating case', error });
    }
};

// Delete a case by ID
export const deleteCase = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const deletedCase = await Case.findByIdAndDelete(id);
        if (!deletedCase) {
            return res.status(404).json({ message: 'Case not found' });
        }
        return res.status(204).json();
    } catch (error) {
        return res.status(500).json({ message: 'Error deleting case', error });
    }
};
