import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Task } from './task.model';
import { CreateTaskDto } from './dto/create-task.dto';
import { GetTasksFilterDto } from './dto/get-tasks-filter.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Task as TaskEntity } from './task.entity';
import { User } from '../auth/user.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(TaskEntity)
    private tasksRepository: Repository<TaskEntity>,
  ) {}

  async getTasks(
    filterDto: GetTasksFilterDto,
    user: User,
  ): Promise<TaskEntity[]> {
    const { status, search } = filterDto;

    const query = this.tasksRepository.createQueryBuilder('task');
    query.where({ user });

    if (status) {
      query.andWhere('task.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        '(LOWER(task.title) LIKE LOWER(:search) OR LOWER(task.description) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    const tasks = await query.getMany();
    return tasks;
  }

  async createTask(createTaskDto: CreateTaskDto, user: User): Promise<Task> {
    const { title, description } = createTaskDto;
    const taskExists = await this.tasksRepository.exist({
      where: {
        title: title,
        description: description,
        user: user,
      },
    });
    if (taskExists) {
      throw new BadRequestException(
        `Task with title ${createTaskDto.title} and description ${createTaskDto.description} already exists`,
      );
    }

    const newTask = this.tasksRepository.create({
      title,
      description,
      user,
    });
    return this.tasksRepository.save(newTask);
  }

  async getTaskById(id: string, user: User): Promise<TaskEntity> {
    const task = await this.tasksRepository.findOne({ where: { id, user } });

    if (!task) {
      throw new NotFoundException(`Task with id ${id} not found`);
    }
    return task;
  }

  async deleteTaskById(id: string, user: User): Promise<void> {
    await this.getTaskById(id, user);
    await this.tasksRepository.delete(id);
  }

  async updateTaskStatusById(
    id: string,
    updateTaskStatusDto: UpdateTaskStatusDto,
    user: User,
  ): Promise<TaskEntity> {
    const task = await this.getTaskById(id, user);
    task.status = updateTaskStatusDto.status;
    await this.tasksRepository.save(task);
    return task;
  }
}
